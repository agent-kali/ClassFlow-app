import type { Conflict } from "@/domain/conflicts";
import type { Lesson } from "@/domain/types";
import { hasOverlapConflict, sortLessonsChronologically } from "./lessonCardModel";

/**
 * The readable day list. It names each lesson in full and never changes the
 * lesson's times — the timeline still owns position and duration.
 */

export type AgendaStatus =
  | { kind: "cancelled" }
  | { kind: "no-show" }
  | { kind: "double-booking" }
  | { kind: "tight-travel"; gapMin: number };

export interface AgendaStatusLabels {
  cancelled: string;
  noShow: string;
  doubleBooking: string;
  tightTravel: (gapMin: number) => string;
}

export interface DayAgendaItem {
  lesson: Lesson;
  groupCode: string;
  /** "Program · level", or whichever half exists. */
  programLevel: string;
  teacherName: string;
  campusName: string;
  roomName: string;
  statuses: AgendaStatus[];
}

export interface DayAgendaSources {
  groupCode: (classGroupId: string) => string | undefined;
  programLevel: (classGroupId: string) => string | undefined;
  teacherName: (teacherId: string) => string | undefined;
  campusName: (roomId: string) => string | undefined;
  roomName: (roomId: string) => string | undefined;
}

/**
 * Statuses a manager can read without opening the lesson.
 * A scheduled lesson keeps every active problem: a double-booking and a tight
 * hop can both be true, and each tight hop keeps its own gap. Cancelled and
 * no-show replace those, because the lesson is not happening.
 */
export function agendaStatuses(lesson: Lesson, conflicts: Conflict[]): AgendaStatus[] {
  if (lesson.status === "cancelled") return [{ kind: "cancelled" }];
  if (lesson.status === "no-show") return [{ kind: "no-show" }];
  if (lesson.status !== "scheduled") return [];

  const statuses: AgendaStatus[] = [];
  if (hasOverlapConflict(conflicts)) statuses.push({ kind: "double-booking" });
  for (const conflict of conflicts) {
    if (conflict.type === "travel") {
      statuses.push({ kind: "tight-travel", gapMin: conflict.gapMin });
    }
  }
  return statuses;
}

export function agendaStatusTexts(
  statuses: AgendaStatus[],
  labels: AgendaStatusLabels
): string[] {
  return statuses.map((status) => {
    switch (status.kind) {
      case "cancelled":
        return labels.cancelled;
      case "no-show":
        return labels.noShow;
      case "double-booking":
        return labels.doubleBooking;
      case "tight-travel":
        return labels.tightTravel(status.gapMin);
    }
  });
}

export function programLevelOf(program: string | undefined, level: string | undefined): string {
  return [program, level].filter((part) => !!part && part.length > 0).join(" · ");
}

/**
 * One row per lesson on `date` for the teachers still in view, earliest start
 * first. The same start keeps the longer lesson first, then id, matching the
 * timeline's chronological sort.
 */
export function buildDayAgenda(
  lessons: Lesson[],
  date: string,
  teacherIds: readonly string[],
  conflictsByLesson: Map<string, Conflict[]>,
  sources: DayAgendaSources
): DayAgendaItem[] {
  const teachers = new Set(teacherIds);
  const dayLessons = lessons.filter(
    (lesson) => lesson.date === date && teachers.has(lesson.teacherId)
  );

  return sortLessonsChronologically(dayLessons).map((lesson) => ({
    lesson,
    groupCode: sources.groupCode(lesson.classGroupId) ?? "",
    programLevel: sources.programLevel(lesson.classGroupId) ?? "",
    teacherName: sources.teacherName(lesson.teacherId) ?? "",
    campusName: sources.campusName(lesson.roomId) ?? "",
    roomName: sources.roomName(lesson.roomId) ?? "",
    statuses: agendaStatuses(lesson, conflictsByLesson.get(lesson.id) ?? []),
  }));
}
