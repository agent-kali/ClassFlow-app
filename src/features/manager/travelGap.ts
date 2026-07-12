import type { Conflict } from "@/domain/conflicts";

export type TravelConflict = Extract<Conflict, { type: "travel" }>;

export function travelGapKey(c: Pick<TravelConflict, "lessonIds">): string {
  return `${c.lessonIds[0]}|${c.lessonIds[1]}`;
}

/** Short campus label from id suffix (e.g. lla-ndc → NDC). */
export function campusShortFromId(campusId: string): string {
  const parts = campusId.split("-");
  return (parts[parts.length - 1] ?? campusId).toUpperCase();
}
