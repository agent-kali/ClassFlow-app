import type { Lesson, Room } from "./types";

/**
 * Conflicts surface themselves; the manager never hunts for them.
 * Cancelled / no-show lessons cannot conflict — they aren't happening.
 */

/**
 * Minimum gap for the same teacher to travel between different campuses.
 * Consecutive lessons at different campuses closer than this raise a warning.
 */
export const MIN_TRAVEL_GAP_MINUTES = 45;

export type Conflict =
  | { type: "overlap"; kind: "teacher"; lessonIds: [string, string] }
  | { type: "overlap"; kind: "room"; lessonIds: [string, string] }
  | {
      type: "travel";
      teacherId: string;
      lessonIds: [string, string];
      gapMin: number;
    };

export type TeacherOverlap = Extract<Conflict, { type: "overlap"; kind: "teacher" }>;

export function isTeacherOverlap(c: Conflict): c is TeacherOverlap {
  return c.type === "overlap" && c.kind === "teacher";
}

/** Inclusive overlap length; 0 if the intervals only touch or do not meet. */
export function overlapMinutes(
  a: Pick<Lesson, "startMin" | "endMin">,
  b: Pick<Lesson, "startMin" | "endMin">
): number {
  return Math.max(0, Math.min(a.endMin, b.endMin) - Math.max(a.startMin, b.startMin));
}

function overlaps(a: Lesson, b: Lesson): boolean {
  return a.date === b.date && a.startMin < b.endMin && a.endMin > b.startMin;
}

export function detectConflicts(
  lessons: Lesson[],
  roomsById: Map<string, Room>
): Conflict[] {
  const active = lessons.filter((l) => l.status === "scheduled");
  const conflicts: Conflict[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (!overlaps(a, b)) continue;
      if (a.teacherId === b.teacherId) {
        conflicts.push({ type: "overlap", kind: "teacher", lessonIds: [a.id, b.id] });
      }
      if (a.roomId === b.roomId) {
        conflicts.push({ type: "overlap", kind: "room", lessonIds: [a.id, b.id] });
      }
    }
  }

  // Travel warnings: consecutive same-teacher lessons on the same day at
  // different campuses with a gap under the threshold (overlaps handled above).
  const byTeacherDay = new Map<string, Lesson[]>();
  for (const l of active) {
    const key = `${l.teacherId}|${l.date}`;
    const list = byTeacherDay.get(key) ?? [];
    list.push(l);
    byTeacherDay.set(key, list);
  }
  for (const list of byTeacherDay.values()) {
    list.sort((a, b) => a.startMin - b.startMin);
    for (let i = 0; i < list.length - 1; i++) {
      const prev = list[i];
      const next = list[i + 1];
      const gapMin = next.startMin - prev.endMin;
      if (gapMin < 0) continue; // overlapping — already reported
      const prevCampus = roomsById.get(prev.roomId)?.campusId;
      const nextCampus = roomsById.get(next.roomId)?.campusId;
      if (!prevCampus || !nextCampus || prevCampus === nextCampus) continue;
      if (gapMin < MIN_TRAVEL_GAP_MINUTES) {
        conflicts.push({
          type: "travel",
          teacherId: prev.teacherId,
          lessonIds: [prev.id, next.id],
          gapMin,
        });
      }
    }
  }

  return conflicts;
}

/** Stable identity for a conflict, so two detections can be compared. */
export function conflictKey(c: Conflict): string {
  const kind = c.type === "overlap" ? c.kind : c.type;
  return `${c.type}:${kind}:${[...c.lessonIds].sort().join("|")}`;
}

/**
 * What a pending edit is responsible for: conflicts around `lessonId` that
 * exist in `after` but did not in `before`. Pre-existing conflicts stay out —
 * the manager is warned about the consequence of this edit, nothing else.
 */
export function conflictsIntroduced(
  before: Lesson[],
  after: Lesson[],
  roomsById: Map<string, Room>,
  lessonId: string
): Conflict[] {
  const existing = new Set(detectConflicts(before, roomsById).map(conflictKey));
  return detectConflicts(after, roomsById).filter(
    (c) => c.lessonIds.includes(lessonId) && !existing.has(conflictKey(c))
  );
}

/** Lesson id → the conflicts it participates in. */
export function conflictsByLesson(conflicts: Conflict[]): Map<string, Conflict[]> {
  const map = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    for (const id of c.lessonIds) {
      const list = map.get(id) ?? [];
      list.push(c);
      map.set(id, list);
    }
  }
  return map;
}
