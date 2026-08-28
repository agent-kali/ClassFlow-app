import type { Lesson } from "@/domain/types";
import type { TeacherOverlap } from "@/domain/conflicts";

export type { TeacherOverlap };

export function overlapKey(c: Pick<TeacherOverlap, "lessonIds">): string {
  return `${c.lessonIds[0]}|${c.lessonIds[1]}`;
}

/** The earlier-starting lesson in the pair — the one the header badge opens first. */
export function earlierLessonId(
  c: Pick<TeacherOverlap, "lessonIds">,
  byId: Map<string, Lesson>
): string {
  const a = byId.get(c.lessonIds[0]);
  const b = byId.get(c.lessonIds[1]);
  if (!a || !b) return c.lessonIds[0];
  if (a.date !== b.date) return a.date <= b.date ? a.id : b.id;
  if (a.startMin !== b.startMin) return a.startMin <= b.startMin ? a.id : b.id;
  return a.id;
}
