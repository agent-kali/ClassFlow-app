import { isPayable, lessonHours, type Lesson, type Teacher } from "./types";

/**
 * Pay is a read-only derived value: delivered hours × the teacher's USD rate.
 * Scheduled lessons are assumed delivered; cancelled and no-show lessons are
 * excluded entirely — didn't happen, not paid. VND conversion happens at the
 * display edge via domain/money, never here.
 */
export interface Earnings {
  hours: number;
  usd: number;
  lessonCount: number;
  excludedCount: number;
}

export function earningsFor(
  teacher: Teacher,
  lessons: Lesson[],
  range: { from: string; to: string }
): Earnings {
  let hours = 0;
  let lessonCount = 0;
  let excludedCount = 0;
  for (const lesson of lessons) {
    if (lesson.teacherId !== teacher.id) continue;
    if (lesson.date < range.from || lesson.date > range.to) continue;
    if (!isPayable(lesson)) {
      excludedCount++;
      continue;
    }
    hours += lessonHours(lesson);
    lessonCount++;
  }
  return { hours, usd: hours * teacher.usdRate, lessonCount, excludedCount };
}
