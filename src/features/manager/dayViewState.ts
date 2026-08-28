import { addDays, parseISO } from "date-fns";
import { toIsoDate } from "@/domain/time";
import { isTeacherOverlap, type Conflict } from "@/domain/conflicts";
import type { Lesson } from "@/domain/types";
import type { ScheduleFilters } from "./filters";

/**
 * The manager schedule shows one of two views of the same week. This module
 * holds the decisions that move between them — which day to open, where an
 * issue lives, and what each date tab should announce.
 */

export type ScheduleViewMode = "week" | "day";

/**
 * Opening Day View lands on the date the manager was already looking at:
 * a highlighted lesson's day, else today when today is in the visible week,
 * else Monday.
 */
export function resolveInitialDayDate(input: {
  highlightedDate?: string | null;
  today: string;
  weekDays: string[];
}): string {
  const { highlightedDate, today, weekDays } = input;
  if (highlightedDate && weekDays.includes(highlightedDate)) return highlightedDate;
  if (weekDays.includes(today)) return today;
  return weekDays[0];
}

export function shiftDay(date: string, delta: number): string {
  return toIsoDate(addDays(parseISO(date), delta));
}

/** Filter ids to add so a target stays visible; empty sets already mean "all". */
export interface FilterWidening {
  teacherIds: string[];
  campusIds: string[];
  schoolIds: string[];
}

export interface IssueNavigation {
  date: string;
  focusLessonIds: string[];
  teacherIds: string[];
  widen: FilterWidening;
}

export function isWideningNeeded(widen: FilterWidening): boolean {
  return (
    widen.teacherIds.length > 0 || widen.campusIds.length > 0 || widen.schoolIds.length > 0
  );
}

/**
 * Where an issue lives and what has to become visible to see it. Active
 * filters are widened by the ids the issue needs, never cleared — the
 * manager's other narrowing survives the jump.
 */
export function resolveIssueNavigation(
  pair: Lesson[],
  filters: ScheduleFilters,
  locate: (lesson: Lesson) => { campusId?: string; schoolId?: string }
): IssueNavigation | null {
  const lessons = pair.filter(Boolean);
  if (lessons.length === 0) return null;

  const teacherIds: string[] = [];
  const widen: FilterWidening = { teacherIds: [], campusIds: [], schoolIds: [] };

  const add = (list: string[], id: string | undefined, active: Set<string>) => {
    if (!id) return;
    // An empty set means "show everything", so there is nothing to widen.
    if (active.size === 0) return;
    if (active.has(id) || list.includes(id)) return;
    list.push(id);
  };

  for (const lesson of lessons) {
    if (!teacherIds.includes(lesson.teacherId)) teacherIds.push(lesson.teacherId);
    const { campusId, schoolId } = locate(lesson);
    add(widen.teacherIds, lesson.teacherId, filters.teacherIds);
    add(widen.campusIds, campusId, filters.campusIds);
    add(widen.schoolIds, schoolId, filters.schoolIds);
  }

  const earliest = [...lessons].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin
  )[0];

  return {
    date: earliest.date,
    focusLessonIds: lessons.map((l) => l.id),
    teacherIds,
    widen,
  };
}

export type DayIssueKind = "overlap" | "travel" | null;

export interface DayMarker {
  date: string;
  count: number;
  /** Double-bookings outrank travel: the louder problem owns the marker. */
  issue: DayIssueKind;
}

/**
 * One entry per date tab: how many lessons the manager will find there and
 * whether the day holds a problem worth a marker.
 */
export function buildDayIssueMarkers(
  days: string[],
  lessons: Lesson[],
  conflicts: Conflict[]
): DayMarker[] {
  const counts = new Map<string, number>();
  const byId = new Map<string, Lesson>();
  for (const lesson of lessons) {
    counts.set(lesson.date, (counts.get(lesson.date) ?? 0) + 1);
    byId.set(lesson.id, lesson);
  }

  const overlapDays = new Set<string>();
  const travelDays = new Set<string>();
  for (const conflict of conflicts) {
    const first = byId.get(conflict.lessonIds[0]);
    const second = byId.get(conflict.lessonIds[1]);
    if (!first || !second) continue;
    if (isTeacherOverlap(conflict)) overlapDays.add(first.date);
    else if (conflict.type === "travel") travelDays.add(first.date);
  }

  return days.map((date) => ({
    date,
    count: counts.get(date) ?? 0,
    issue: overlapDays.has(date) ? "overlap" : travelDays.has(date) ? "travel" : null,
  }));
}
