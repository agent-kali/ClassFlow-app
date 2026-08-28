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
import { schools, campuses, rooms, classGroups } from "./fixtures/schools";
import { teachers, captureFxRate } from "./fixtures/teachers";
import { buildDemoLessons } from "./fixtures/lessons";

/**
 * The single in-memory source of truth. Both screens subscribe to it, so a
 * manager edit is on the teacher's phone the moment it happens — there is
 * no "save and send" anywhere.
 */

/** A pay consequence emitted by a mutation, for the ambient money flash. */
export interface PayEffect {
  id: number;
  teacherId: string;
  deltaUsd: number;
  at: number;
}

interface ClassFlowState {
  schools: School[];
  campuses: Campus[];
  rooms: Room[];
  teachers: Teacher[];
  classGroups: ClassGroup[];
  lessons: Lesson[];
  fxRate: FxRate;
  /** "Today" for the demo — the anchor the mock week is generated around. */
  today: string;
  lastPayEffect: PayEffect | null;

  createLesson(input: LessonInput): Lesson;
  updateLesson(id: string, patch: Partial<LessonInput>): void;
  /** Edit any lesson field; a changed day or start time keeps the move visible. */
  editLesson(id: string, patch: Partial<LessonInput>): void;
  setLessonStatus(id: string, status: LessonStatus): void;
  rescheduleLesson(id: string, date: string, startMin: number, endMin: number): void;
  importLessons(inputs: LessonInput[]): Lesson[];
}

let lessonSeq = 1000;
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

const seedDate = new Date();

export const useClassFlowStore = create<ClassFlowState>((set, get) => ({
  schools,
  campuses,
  rooms,
  teachers,
  classGroups,
  lessons: buildDemoLessons(seedDate),
  fxRate: captureFxRate(toIsoDate(seedDate)),
  today: toIsoDate(seedDate),
  lastPayEffect: null,

  createLesson(input) {
    const lesson: Lesson = { ...input, id: `ls-${++lessonSeq}` };
    const deltaUsd = payableUsd(lesson, get().teachers);
    set((s) => ({
      lessons: [...s.lessons, lesson],
      lastPayEffect: deltaUsd
        ? { id: ++effectSeq, teacherId: lesson.teacherId, deltaUsd, at: Date.now() }
        : s.lastPayEffect,
    }));
    return lesson;
  },

  updateLesson(id, patch) {
    set((s) => {
      const before = s.lessons.find((l) => l.id === id);
      if (!before) return s;
      const after = { ...before, ...patch };
      const deltaUsd = payableUsd(after, s.teachers) - payableUsd(before, s.teachers);
      return {
        lessons: s.lessons.map((l) => (l.id === id ? after : l)),
        lastPayEffect: deltaUsd
          ? { id: ++effectSeq, teacherId: after.teacherId, deltaUsd, at: Date.now() }
          : s.lastPayEffect,
      };
    });
  },

  editLesson(id, patch) {
    const before = get().lessons.find((l) => l.id === id);
    if (!before) return;
    const moved =
      (patch.date !== undefined && patch.date !== before.date) ||
      (patch.startMin !== undefined && patch.startMin !== before.startMin);
    get().updateLesson(id, moved ? { ...patch, movedFrom: moveOrigin(before) } : patch);
  },

  setLessonStatus(id, status) {
    get().updateLesson(id, { status });
  },

  rescheduleLesson(id, date, startMin, endMin) {
    const before = get().lessons.find((l) => l.id === id);
    if (!before) return;
    get().updateLesson(id, { date, startMin, endMin, movedFrom: moveOrigin(before) });
  },

  importLessons(inputs) {
    const created = inputs.map((input): Lesson => ({ ...input, id: `ls-${++lessonSeq}` }));
    set((s) => ({ lessons: [...s.lessons, ...created] }));
    return created;
  },
}));
