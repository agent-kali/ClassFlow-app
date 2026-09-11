import { parseISO } from "date-fns";
import { lessonHasEnded, type Instant } from "@/domain/earnings";
import { isPayable, type Lesson } from "@/domain/types";

type Timed = Pick<Lesson, "status" | "date" | "startMin" | "endMin">;

export interface OperationalLesson<T> {
  lesson: T;
  happeningNow: boolean;
}

function startsBefore(a: Timed, b: Timed): boolean {
  return a.date < b.date || (a.date === b.date && a.startMin < b.startMin);
}

/**
 * The teacher's real next obligation: the payable lesson in progress right
 * now, else the earliest payable lesson still ahead of `asOf`. Deliberately
 * searches the teacher's whole lesson set — browsing another week or month
 * must never replace or hide it. Cancelled and no-show never qualify.
 */
export function findOperationalLesson<T extends Timed>(
  lessons: T[],
  asOf: Instant
): OperationalLesson<T> | null {
  let now: T | undefined;
  let next: T | undefined;
  for (const lesson of lessons) {
    if (!isPayable(lesson)) continue;
    if (
      lesson.date === asOf.date &&
      asOf.min >= lesson.startMin &&
      asOf.min < lesson.endMin
    ) {
      if (!now || startsBefore(lesson, now)) now = lesson;
      continue;
    }
    if (
      lesson.date > asOf.date ||
      (lesson.date === asOf.date && lesson.startMin > asOf.min)
    ) {
      if (!next || startsBefore(lesson, next)) next = lesson;
    }
  }
  if (now) return { lesson: now, happeningNow: true };
  return next ? { lesson: next, happeningNow: false } : null;
}

/** Whole minutes from `asOf` until the lesson starts; never negative. */
export function minutesUntil(asOf: Instant, lesson: Pick<Lesson, "date" | "startMin">): number {
  const from = parseISO(asOf.date).getTime();
  const to = parseISO(lesson.date).getTime();
  const dayDiff = Math.round((to - from) / 86_400_000);
  return Math.max(0, dayDiff * 24 * 60 + (lesson.startMin - asOf.min));
}

export interface StreamCounts {
  scheduled: number;
  delivered: number;
  cancelled: number;
  noShow: number;
  total: number;
  allDelivered: boolean;
}

export function countTeacherStream(
  lessons: Array<Pick<Lesson, "status" | "date" | "endMin">>,
  asOf: Instant
): StreamCounts {
  let scheduled = 0;
  let delivered = 0;
  let cancelled = 0;
  let noShow = 0;
  for (const lesson of lessons) {
    if (!isPayable(lesson)) {
      if (lesson.status === "no-show") noShow++;
      else cancelled++;
      continue;
    }
    scheduled++;
    if (lessonHasEnded(lesson, asOf)) delivered++;
  }
  const total = lessons.length;
  return {
    scheduled,
    delivered,
    cancelled,
    noShow,
    total,
    allDelivered: total > 0 && delivered === total,
  };
}

export function formatTeacherStreamSubline(counts: StreamCounts, dayCount: number): string {
  if (counts.total === 0) return "No lessons in this period.";
  if (counts.allDelivered) {
    return `${counts.total} lesson${counts.total === 1 ? "" : "s"} across ${dayCount} day${dayCount === 1 ? "" : "s"}`;
  }
  const parts = [`${counts.scheduled} scheduled`, `${counts.delivered} delivered`];
  if (counts.cancelled > 0) parts.push(`${counts.cancelled} cancelled`);
  if (counts.noShow > 0) parts.push(`${counts.noShow} no-show`);
  return parts.join(" · ");
}
