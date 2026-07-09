import type { Lesson } from "@/domain/types";

export interface LaidOutLesson {
  lesson: Lesson;
  /** 0-based lane within its overlap cluster. */
  lane: number;
  /** Total lanes in the cluster, for width division. */
  laneCount: number;
}

/**
 * Assign side-by-side lanes to lessons that overlap in time within one day.
 * Classic interval layout: sort by start, greedily reuse the first free lane,
 * and size every member of a transitive overlap cluster to the cluster's width.
 */
export function layoutDay(lessons: Lesson[]): LaidOutLesson[] {
  const sorted = [...lessons].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin
  );

  const results: LaidOutLesson[] = [];
  let cluster: LaidOutLesson[] = [];
  let laneEnds: number[] = []; // end time currently occupying each lane
  let clusterEnd = -1;

  const flush = () => {
    const laneCount = laneEnds.length;
    for (const item of cluster) item.laneCount = laneCount;
    results.push(...cluster);
    cluster = [];
    laneEnds = [];
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
    cluster.push({ lesson, lane, laneCount: 1 });
    clusterEnd = Math.max(clusterEnd, lesson.endMin);
  }
  flush();

  return results;
}
