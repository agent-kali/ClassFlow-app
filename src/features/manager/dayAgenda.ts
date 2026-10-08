import type { Conflict } from "@/domain/conflicts";
import type { Lesson } from "@/domain/types";
import { hasOverlapConflict, sortLessonsChronologically } from "./lessonCardModel";

/**
 * The readable day list. It names each lesson in full and never changes the
 * lesson's times. A clock scale, when the manager opens one, is a separate tool.
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

export interface DayCues {
  /** Scheduled lessons in progress on the open day, when that day is today. */
  nowIds: string[];
  /** Scheduled lessons that share the next start, when nothing is in progress. */
  nextIds: string[];
}

/**
 * Which rows answer "what is happening, or what is next?"
 * Only the open day, and only when it is today. Cancelled and no-show lessons
 * are not happening, and a finished lesson is not next.
 */
export function resolveDayCues(
  items: readonly { lesson: Pick<Lesson, "id" | "status" | "startMin" | "endMin"> }[],
  date: string,
  today: string,
  nowMin: number | null
): DayCues {
  if (date !== today || nowMin === null) return { nowIds: [], nextIds: [] };

  const scheduled = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.lesson.status === "scheduled")
    .sort(
      (a, b) => a.item.lesson.startMin - b.item.lesson.startMin || a.index - b.index
    )
    .map(({ item }) => item);

  const nowIds = scheduled
    .filter((item) => item.lesson.startMin <= nowMin && item.lesson.endMin > nowMin)
    .map((item) => item.lesson.id);
  if (nowIds.length > 0) return { nowIds, nextIds: [] };

  const upcoming = scheduled.filter((item) => item.lesson.startMin > nowMin);
  if (upcoming.length === 0) return { nowIds: [], nextIds: [] };
  const nextStart = upcoming[0].lesson.startMin;
  return {
    nowIds: [],
    nextIds: upcoming
      .filter((item) => item.lesson.startMin === nextStart)
      .map((item) => item.lesson.id),
  };
}

/** A tight hop drawn between the two lessons it separates. */
export interface TightTravelConnector {
  beforeLessonId: string;
  fromLessonId: string;
  gapMin: number;
  fromCampus: string;
  toCampus: string;
}

/**
 * One connector per tight-travel conflict whose both lessons are still in the
 * list and still scheduled. It sits in front of the later lesson. Same-campus
 * gaps and gaps the domain does not call tight produce nothing here.
 */
export function buildTightTravelConnectors(
  items: readonly DayAgendaItem[],
  conflictsByLesson: Map<string, Conflict[]>
): TightTravelConnector[] {
  const byId = new Map(items.map((item) => [item.lesson.id, item]));
  const seen = new Set<string>();
  const connectors: TightTravelConnector[] = [];

  for (const item of items) {
    for (const conflict of conflictsByLesson.get(item.lesson.id) ?? []) {
      if (conflict.type !== "travel") continue;
      const [fromId, toId] = conflict.lessonIds;
      const key = `${fromId}|${toId}`;
      if (seen.has(key)) continue;
      const from = byId.get(fromId);
      const to = byId.get(toId);
      if (!from || !to) continue;
      if (from.lesson.status !== "scheduled" || to.lesson.status !== "scheduled") continue;
      seen.add(key);
      connectors.push({
        beforeLessonId: to.lesson.id,
        fromLessonId: from.lesson.id,
        gapMin: conflict.gapMin,
        fromCampus: from.campusName,
        toCampus: to.campusName,
      });
    }
  }

  return connectors;
}
