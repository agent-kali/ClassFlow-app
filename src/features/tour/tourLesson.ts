import type { Lesson } from "@/domain/types";

/** Stable guided-tour target: first scheduled LP12B01B @ 18:00 in the visible week. */
export function resolveTourLessonId(
  lessons: Lesson[],
  weekDays: readonly string[],
  classGroupCode: (classGroupId: string) => string | undefined
): string | null {
  const daySet = new Set(weekDays);
  const candidates = lessons
    .filter((l) => {
      if (!daySet.has(l.date) || l.status !== "scheduled" || l.startMin !== 18 * 60) {
        return false;
      }
      return classGroupCode(l.classGroupId) === "LP12B01B";
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  return candidates[0]?.id ?? null;
}
