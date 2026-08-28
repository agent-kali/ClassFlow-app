import { isTeacherOverlap, type Conflict } from "@/domain/conflicts";
import type { Lesson, SchoolColor } from "@/domain/types";

const SCHOOL_ACCENT: Record<SchoolColor, string> = {
  teal: "var(--school-teal)",
  amber: "var(--school-amber)",
  plum: "var(--school-plum)",
  moss: "var(--school-moss)",
};

export type DayPeriod = "morning" | "afternoon" | "evening";

export function hasOverlapConflict(conflicts: Conflict[]): boolean {
  return conflicts.some(isTeacherOverlap);
}

export function periodOf(startMin: number): DayPeriod {
  if (startMin < 12 * 60) return "morning";
  if (startMin < 17 * 60) return "afternoon";
  return "evening";
}

export function periodDividerLabel(period: DayPeriod): "AFTERNOON" | "EVENING" | null {
  if (period === "afternoon") return "AFTERNOON";
  if (period === "evening") return "EVENING";
  return null;
}

export function isLessonPast(lesson: Lesson, today: string, nowMin: number | null): boolean {
  if (lesson.status !== "scheduled") return false;
  if (lesson.date < today) return true;
  if (lesson.date === today && nowMin !== null && lesson.endMin <= nowMin) return true;
  return false;
}

export function accentForSchool(
  schoolColor: SchoolColor | undefined,
  isOff: boolean,
  isPast: boolean
): string {
  const base = schoolColor ? SCHOOL_ACCENT[schoolColor] : "var(--ink-faint)";
  if (isOff) return `color-mix(in oklab, ${base} 40%, #9a9384)`;
  if (isPast) return `color-mix(in oklab, ${base} 55%, #9a9384)`;
  return base;
}

/** Chronological order for agenda stacks. */
export function sortLessonsChronologically(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.id.localeCompare(b.id)
  );
}
