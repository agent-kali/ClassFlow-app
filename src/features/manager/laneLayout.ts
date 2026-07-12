import type { Lesson } from "@/domain/types";

/** Max side-by-side cards before overflow collapses into "+N". */
export const MAX_VISIBLE_LANES = 3;

/** Horizontal gap between adjacent lanes (px). Spines must never touch. */
export const LANE_GUTTER_PX = 2;

/** Inset from the day-column edges (px). */
export const LANE_EDGE_PX = 1;

/** Reserved strip on the right when a cluster has overflow lessons. */
export const OVERFLOW_STRIP_PX = 20;

export interface LaidOutLesson {
  lesson: Lesson;
  /** 0-based lane within its overlap cluster (always < MAX_VISIBLE_LANES). */
  lane: number;
  /** Visible lane count for width division (1..MAX_VISIBLE_LANES). */
  laneCount: number;
  /** True when this cluster also has collapsed overflow lessons. */
  hasOverflow: boolean;
}

export interface OverflowGroup {
  id: string;
  /** Lessons hidden behind the "+N" control. */
  lessons: Lesson[];
  startMin: number;
  endMin: number;
}

export interface DayLayout {
  visible: LaidOutLesson[];
  overflow: OverflowGroup[];
}

interface Tentative {
  lesson: Lesson;
  lane: number;
}

/**
 * Assign side-by-side lanes to lessons that overlap in time within one day.
 * Classic interval layout: sort by start, greedily reuse the first free lane,
 * size every member of a transitive overlap cluster to the cluster's width,
 * and collapse lanes beyond MAX_VISIBLE_LANES into an overflow group.
 */
export function layoutDay(lessons: Lesson[]): DayLayout {
  const sorted = [...lessons].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.id.localeCompare(b.id)
  );

  const visible: LaidOutLesson[] = [];
  const overflow: OverflowGroup[] = [];

  let cluster: Tentative[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  let clusterSeq = 0;

  const flush = () => {
    if (cluster.length === 0) return;

    const rawLaneCount = laneEnds.length;
    const laneCount = Math.min(rawLaneCount, MAX_VISIBLE_LANES);
    const hasOverflow = rawLaneCount > MAX_VISIBLE_LANES;
    const hidden: Lesson[] = [];

    for (const item of cluster) {
      if (item.lane < MAX_VISIBLE_LANES) {
        visible.push({
          lesson: item.lesson,
          lane: item.lane,
          laneCount,
          hasOverflow,
        });
      } else {
        hidden.push(item.lesson);
      }
    }

    if (hidden.length > 0) {
      overflow.push({
        id: `ov-${clusterSeq++}-${hidden[0].id}`,
        lessons: hidden,
        startMin: Math.min(...hidden.map((l) => l.startMin)),
        endMin: Math.max(...hidden.map((l) => l.endMin)),
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

  return { visible, overflow };
}
