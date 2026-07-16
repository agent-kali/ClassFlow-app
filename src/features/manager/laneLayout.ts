import type { Lesson } from "@/domain/types";

/** Inset from the day-column edges (px). */
export const LANE_EDGE_PX = 1;

/** Below this lane width (px), multi-lane cards stay compact (code + start only). */
export const COMPACT_LANE_WIDTH_PX = 84;

export interface LaidOutLesson {
  lesson: Lesson;
  /** 0-based lane within its overlap cluster. */
  lane: number;
  /** Simultaneous lane count for width division in this cluster (≥ 1). */
  laneCount: number;
}

interface Tentative {
  lesson: Lesson;
  lane: number;
}

/**
 * Assign equal-width side-by-side lanes to lessons that overlap in time within one day.
 * Sort by start, greedily place each lesson in the first lane with no time conflict,
 * and size every member of a transitive overlap cluster to the cluster's max lane count.
 * Non-overlapping lessons each form their own cluster with laneCount = 1 (full width).
 */
export function layoutDay(lessons: Lesson[]): LaidOutLesson[] {
  const sorted = [...lessons].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.id.localeCompare(b.id)
  );

  const results: LaidOutLesson[] = [];
  let cluster: Tentative[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;

    const laneCount = Math.max(1, laneEnds.length);
    for (const item of cluster) {
      results.push({
        lesson: item.lesson,
        lane: item.lane,
        laneCount,
      });
    }

    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const lesson of sorted) {
    if (cluster.length > 0 && lesson.startMin >= clusterEnd) flush();

    let lane = laneEnds.findIndex((end) => end <= lesson.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(lesson.endMin);
    } else {
      laneEnds[lane] = lesson.endMin;
    }
    cluster.push({ lesson, lane });
    clusterEnd = Math.max(clusterEnd, lesson.endMin);
  }
  flush();

  return results;
}
