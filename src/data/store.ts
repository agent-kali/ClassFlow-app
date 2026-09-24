"use client";

import { create } from "zustand";
import type {
  Campus,
  ClassGroup,
  FxRate,
  Lesson,
  LessonInput,
  LessonStatus,
  Room,
  School,
  Teacher,
} from "@/domain/types";
import { isPayable, lessonHours } from "@/domain/types";
import { toIsoDate } from "@/domain/time";
import type { DataSource } from "./source";
import { loadSchedule } from "./source";
import { getDataSource } from "./client";

/**
 * The client-side cache of server state. PostgreSQL owns the schedule; this
 * holds what the last request returned so both screens render from one shape
 * and derived values (pay, conflicts) keep working on a plain array.
 *
 * Every mutation goes to the backend first and then splices the stored lesson
 * it returns into the cache, so what is on screen is what is in the database.
 * A failed mutation leaves the cache untouched and rethrows for the caller.
 */

/** A pay consequence emitted by a mutation, for the ambient money flash. */
export interface PayEffect {
  id: number;
  teacherId: string;
  deltaUsd: number;
  at: number;
}

export type LoadStatus = "idle" | "loading" | "ready" | "error";

interface ClassFlowState {
  schools: School[];
  campuses: Campus[];
  rooms: Room[];
  teachers: Teacher[];
  classGroups: ClassGroup[];
  lessons: Lesson[];
  fxRate: FxRate;
  /** "Today" in the browser's local calendar. */
  today: string;
  lastPayEffect: PayEffect | null;

  status: LoadStatus;
  /** Why the initial load failed, if it did. */
  loadError: string | null;
  /** Why the last mutation failed. Cleared when another one succeeds. */
  mutationError: string | null;

  load(): Promise<void>;
  clearMutationError(): void;

  createLesson(input: LessonInput): Promise<Lesson>;
  updateLesson(id: string, patch: Partial<LessonInput>): Promise<Lesson>;
  /** Edit any lesson field; a changed day or start time keeps the move visible. */
  editLesson(id: string, patch: Partial<LessonInput>): Promise<Lesson>;
  setLessonStatus(id: string, status: LessonStatus): Promise<Lesson>;
  rescheduleLesson(
    id: string,
    date: string,
    startMin: number,
    endMin: number
  ): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  importLessons(inputs: LessonInput[]): Promise<Lesson[]>;
}

let effectSeq = 0;

function payableUsd(lesson: Lesson, teachers: Teacher[]): number {
  if (!isPayable(lesson)) return 0;
  const teacher = teachers.find((t) => t.id === lesson.teacherId);
  return teacher ? lessonHours(lesson) * teacher.usdRate : 0;
}

/** The origin a move is measured from: the first one, not the latest hop. */
function moveOrigin(before: Lesson): { date: string; startMin: number } {
  return before.movedFrom ?? { date: before.date, startMin: before.startMin };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

const EMPTY_FX: FxRate = { vndPerUsd: 0, capturedOn: "", source: "" };

export function createClassFlowStore(source: DataSource) {
  return create<ClassFlowState>((set, get) => {
    /** Replaces a lesson in the cache and emits the pay delta it caused. */
    const applyUpdated = (updated: Lesson) => {
      set((s) => {
        const before = s.lessons.find((l) => l.id === updated.id);
        const deltaUsd = before
          ? payableUsd(updated, s.teachers) - payableUsd(before, s.teachers)
          : payableUsd(updated, s.teachers);
        return {
          lessons: s.lessons.map((l) => (l.id === updated.id ? updated : l)),
          mutationError: null,
          lastPayEffect: deltaUsd
            ? {
                id: ++effectSeq,
                teacherId: updated.teacherId,
                deltaUsd,
                at: Date.now(),
              }
            : s.lastPayEffect,
        };
      });
      return updated;
    };

    /** Runs a mutation, recording the reason if the backend refuses it. */
    const attempt = async <T>(run: () => Promise<T>): Promise<T> => {
      try {
        return await run();
      } catch (error) {
        set({ mutationError: describeError(error) });
        throw error;
      }
    };

    return {
      schools: [],
      campuses: [],
      rooms: [],
      teachers: [],
      classGroups: [],
      lessons: [],
      fxRate: EMPTY_FX,
      today: toIsoDate(new Date()),
      lastPayEffect: null,
      status: "idle",
      loadError: null,
      mutationError: null,

      async load() {
        if (get().status === "loading") return;
        set({ status: "loading", loadError: null });
        try {
          const snapshot = await loadSchedule(source);
          set({
            ...snapshot,
            today: toIsoDate(new Date()),
            status: "ready",
            loadError: null,
          });
        } catch (error) {
          // No fallback to fixtures: an unreachable backend is an error the
          // manager must see, not a different schedule.
          set({ status: "error", loadError: describeError(error) });
        }
      },

      clearMutationError() {
        set({ mutationError: null });
      },

      async createLesson(input) {
        const created = await attempt(() => source.createLesson(input));
        const deltaUsd = payableUsd(created, get().teachers);
        set((s) => ({
          lessons: [...s.lessons, created],
          mutationError: null,
          lastPayEffect: deltaUsd
            ? { id: ++effectSeq, teacherId: created.teacherId, deltaUsd, at: Date.now() }
            : s.lastPayEffect,
        }));
        return created;
      },

      async updateLesson(id, patch) {
        return applyUpdated(await attempt(() => source.updateLesson(id, patch)));
      },

      async editLesson(id, patch) {
        const before = get().lessons.find((l) => l.id === id);
        if (!before) throw new Error(`Lesson not found: ${id}`);
        const moved =
          (patch.date !== undefined && patch.date !== before.date) ||
          (patch.startMin !== undefined && patch.startMin !== before.startMin);
        // The server applies a patch as given, so the move origin is resolved
        // here from the lesson we already hold and sent explicitly.
        return get().updateLesson(
          id,
          moved ? { ...patch, movedFrom: moveOrigin(before) } : patch
        );
      },

      async setLessonStatus(id, status) {
        return applyUpdated(await attempt(() => source.setLessonStatus(id, status)));
      },

      async rescheduleLesson(id, date, startMin, endMin) {
        // movedFrom is derived by the backend, which is why the response and
        // not the request is what updates the cache.
        return applyUpdated(
          await attempt(() => source.rescheduleLesson(id, date, startMin, endMin))
        );
      },

      async deleteLesson(id) {
        await attempt(() => source.deleteLesson(id));
        set((s) => {
          const removed = s.lessons.find((l) => l.id === id);
          const deltaUsd = removed ? -payableUsd(removed, s.teachers) : 0;
          return {
            lessons: s.lessons.filter((l) => l.id !== id),
            mutationError: null,
            lastPayEffect:
              removed && deltaUsd
                ? {
                    id: ++effectSeq,
                    teacherId: removed.teacherId,
                    deltaUsd,
                    at: Date.now(),
                  }
                : s.lastPayEffect,
          };
        });
      },

      async importLessons(inputs) {
        const created = await attempt(() => source.importLessons(inputs));
        set((s) => ({
          lessons: [...s.lessons, ...created],
          mutationError: null,
        }));
        return created;
      },
    };
  });
}

export const useClassFlowStore = createClassFlowStore(getDataSource());
