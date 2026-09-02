import { lessonHasEnded, type Instant } from "@/domain/earnings";
import { isPayable, type Lesson } from "@/domain/types";

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
