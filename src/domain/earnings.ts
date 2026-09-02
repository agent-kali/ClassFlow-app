import { isPayable, lessonHours, type Lesson, type Teacher } from "./types";

/**
 * Pay is a read-only derived value: payable hours × the teacher's USD rate.
 * Scheduled lessons are assumed payable until cancelled or marked no-show;
 * those exceptions are excluded entirely — didn't happen, not paid.
 * `hours` / `usd` / `lessonCount` are scheduled-in-range (including future).
 * `earned*` is the same payable set whose end is already in the past as of
 * `asOf`. Pay is never persisted. VND conversion happens at the display
 * edge via domain/money, never here.
 */
export interface Instant {
  date: string; // yyyy-MM-dd
  min: number; // minutes from midnight
}

export interface Earnings {
  hours: number;
  usd: number;
  lessonCount: number;
  excludedCount: number;
  earnedHours: number;
  earnedUsd: number;
  earnedCount: number;
}

export function lessonHasEnded(
  lesson: Pick<Lesson, "date" | "endMin">,
  asOf: Instant
): boolean {
  return lesson.date < asOf.date || (lesson.date === asOf.date && lesson.endMin <= asOf.min);
}

export function earningsFor(
  teacher: Teacher,
  lessons: Lesson[],
  range: { from: string; to: string }
): Earnings;
export function earningsFor(
  teacher: Teacher,
  lessons: Lesson[],
  range: { from: string; to: string },
  asOf: Instant
): Earnings;
export function earningsFor(
  teacher: Teacher,
  lessons: Lesson[],
  range: { from: string; to: string },
  asOf?: Instant
): Earnings {
  const instant = asOf ?? { date: range.to, min: 24 * 60 };
  let hours = 0;
  let lessonCount = 0;
  let excludedCount = 0;
  let earnedHours = 0;
  let earnedCount = 0;
  for (const lesson of lessons) {
    if (lesson.teacherId !== teacher.id) continue;
    if (lesson.date < range.from || lesson.date > range.to) continue;
    if (!isPayable(lesson)) {
      excludedCount++;
      continue;
    }
    const h = lessonHours(lesson);
    hours += h;
    lessonCount++;
    if (lessonHasEnded(lesson, instant)) {
      earnedHours += h;
      earnedCount++;
    }
  }
  return {
    hours,
    usd: hours * teacher.usdRate,
    lessonCount,
    excludedCount,
    earnedHours,
    earnedUsd: earnedHours * teacher.usdRate,
    earnedCount,
  };
}
