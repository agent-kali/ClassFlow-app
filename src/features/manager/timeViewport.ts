import { PX_PER_MIN } from "./LessonBlock";

/** Single source of truth: every hour is exactly this tall on the axis. */
export const HOUR_HEIGHT_PX = 60 * PX_PER_MIN;

/** Breathing room above the first hour and below the last so labels clear the sticky header. */
export const AXIS_PADDING_PX = 28;

/** Minimum empty span (no lessons on any visible day) before we de-emphasize it. */
export const EMPTY_SPAN_THRESHOLD_MIN = 2 * 60;

const BUCKET_MIN = 5;
const CLUSTER_GAP_MIN = 90;

export interface TimeRange {
  startMin: number;
  endMin: number;
}

export interface LessonCoverage extends TimeRange {
  /** Index into the visible days array. */
  dayIndex: number;
}

export interface TimeScale {
  topMin: number;
  bottomMin: number;
  totalPx: number;
  /** Y offset of a minute within the linear viewport. */
  minuteToY: (min: number) => number;
  /** Inverse: pointer Y → minute (clamped to axis). */
  yToMinute: (y: number) => number;
  /** Pixel height of [startMin, endMin) under the scale. */
  rangeHeight: (startMin: number, endMin: number) => number;
}

/** Linear scale: one px/min everywhere; gutter, gridlines, and events share it. */
export function createTimeScale(topMin: number, bottomMin: number): TimeScale {
  const spanPx = (bottomMin - topMin) * PX_PER_MIN;
  const totalPx = spanPx + 2 * AXIS_PADDING_PX;

  const minuteToY = (min: number): number => {
    const clamped = Math.max(topMin, Math.min(bottomMin, min));
    return AXIS_PADDING_PX + (clamped - topMin) * PX_PER_MIN;
  };

  const yToMinute = (y: number): number => {
    const clampedY = Math.max(0, Math.min(totalPx, y));
    const raw = topMin + (clampedY - AXIS_PADDING_PX) / PX_PER_MIN;
    return Math.max(topMin, Math.min(bottomMin, raw));
  };

  const rangeHeight = (startMin: number, endMin: number): number =>
    Math.max(0, (endMin - startMin) * PX_PER_MIN);

  return { topMin, bottomMin, totalPx, minuteToY, yToMinute, rangeHeight };
}

/**
 * Per-bucket count of distinct days that have a lesson overlapping the bucket.
 */
function buildCoverage(
  topMin: number,
  bottomMin: number,
  lessons: LessonCoverage[],
  dayCount: number
): number[] {
  const n = Math.max(0, Math.ceil((bottomMin - topMin) / BUCKET_MIN));
  const dayBits: boolean[][] = Array.from({ length: Math.max(dayCount, 1) }, () =>
    Array.from({ length: n }, () => false)
  );

  for (const lesson of lessons) {
    if (lesson.dayIndex < 0 || lesson.dayIndex >= dayBits.length) continue;
    const from = Math.max(lesson.startMin, topMin);
    const to = Math.min(lesson.endMin, bottomMin);
    for (let m = from; m < to; m += BUCKET_MIN) {
      const i = Math.floor((m - topMin) / BUCKET_MIN);
      if (i >= 0 && i < n) dayBits[lesson.dayIndex][i] = true;
    }
  }

  return Array.from({ length: n }, (_, i) =>
    dayBits.reduce((acc, bits) => acc + (bits[i] ? 1 : 0), 0)
  );
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
  const out: TimeRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if (cur.startMin <= prev.endMin) {
      prev.endMin = Math.max(prev.endMin, cur.endMin);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * Empty spans with no lesson on any visible day — used for de-emphasis only,
 * never to compress the axis.
 */
export function findEmptySpans(
  topMin: number,
  bottomMin: number,
  lessons: LessonCoverage[],
  dayCount: number,
  thresholdMin: number = EMPTY_SPAN_THRESHOLD_MIN
): TimeRange[] {
  const coverage = buildCoverage(topMin, bottomMin, lessons, dayCount);
  if (coverage.length === 0) return [];

  const sparseMax = Math.max(1, Math.floor(dayCount / 2) - 1);

  const empty: TimeRange[] = [];
  let runStart: number | null = null;
  for (let i = 0; i <= coverage.length; i++) {
    const emptyBucket = i < coverage.length && coverage[i] === 0;
    if (emptyBucket) {
      if (runStart === null) runStart = i;
    } else if (runStart !== null) {
      empty.push({
        startMin: topMin + runStart * BUCKET_MIN,
        endMin: topMin + i * BUCKET_MIN,
      });
      runStart = null;
    }
  }

  const spans: TimeRange[] = [];
  for (const gap of empty) {
    let start = gap.startMin;
    let end = gap.endMin;

    while (start - BUCKET_MIN >= topMin) {
      const i = Math.floor((start - BUCKET_MIN - topMin) / BUCKET_MIN);
      if (i < 0 || coverage[i] === 0 || coverage[i] > sparseMax) break;
      start -= BUCKET_MIN;
    }
    while (end < bottomMin) {
      const i = Math.floor((end - topMin) / BUCKET_MIN);
      if (i < 0 || i >= coverage.length || coverage[i] === 0 || coverage[i] > sparseMax) {
        break;
      }
      end += BUCKET_MIN;
    }

    if (end - start >= thresholdMin) {
      spans.push({ startMin: start, endMin: end });
    }
  }

  return mergeRanges(spans);
}

interface Cluster {
  startMin: number;
  endMin: number;
  count: number;
}

function lessonClusters(lessons: TimeRange[], gapThresholdMin = CLUSTER_GAP_MIN): Cluster[] {
  if (lessons.length === 0) return [];
  const sorted = [...lessons].sort((a, b) => a.startMin - b.startMin);
  const clusters: Cluster[] = [
    { startMin: sorted[0].startMin, endMin: sorted[0].endMin, count: 1 },
  ];

  for (let i = 1; i < sorted.length; i++) {
    const lesson = sorted[i];
    const cur = clusters[clusters.length - 1];
    if (lesson.startMin - cur.endMin > gapThresholdMin) {
      clusters.push({ startMin: lesson.startMin, endMin: lesson.endMin, count: 1 });
    } else {
      cur.endMin = Math.max(cur.endMin, lesson.endMin);
      cur.count += 1;
    }
  }

  return clusters;
}

/**
 * Default scroll anchor: "now" when it sits near an active lesson, otherwise
 * the center of the busiest lesson cluster (evening when midday is empty).
 */
export function defaultAnchorMin(
  lessons: TimeRange[],
  topMin: number,
  bottomMin: number,
  nowMin: number | null
): number {
  const NEAR_MIN = 45;
  if (
    nowMin !== null &&
    nowMin >= topMin &&
    nowMin <= bottomMin &&
    lessons.some((l) => nowMin >= l.startMin - NEAR_MIN && nowMin <= l.endMin + NEAR_MIN)
  ) {
    return nowMin;
  }

  const clusters = lessonClusters(lessons);
  if (clusters.length === 0) return (topMin + bottomMin) / 2;

  const best = clusters.reduce((a, b) =>
    b.count > a.count || (b.count === a.count && b.startMin > a.startMin) ? b : a
  );
  return (best.startMin + best.endMin) / 2;
}

export function tagLessonsWithDayIndex<T extends TimeRange & { date: string }>(
  lessons: T[],
  days: string[]
): LessonCoverage[] {
  const index = new Map(days.map((d, i) => [d, i]));
  return lessons.map((l) => ({
    startMin: l.startMin,
    endMin: l.endMin,
    dayIndex: index.get(l.date) ?? -1,
  }));
}
