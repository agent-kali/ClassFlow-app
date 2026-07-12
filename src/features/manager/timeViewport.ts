import { PX_PER_MIN } from "./LessonBlock";

/** Collapse ranges longer than this with no (or only sparse) coverage. */
export const EMPTY_GAP_THRESHOLD_MIN = 2 * 60;

/** Slim band height for a collapsed empty/sparse range. */
export const COLLAPSED_BAND_PX = 36;

const BUCKET_MIN = 5;

export interface TimeRange {
  startMin: number;
  endMin: number;
}

export interface LessonCoverage extends TimeRange {
  /** Index into the visible days array. */
  dayIndex: number;
}

export type TimeSegment =
  | { kind: "span"; startMin: number; endMin: number }
  | { kind: "gap"; id: string; startMin: number; endMin: number; collapsed: boolean };

export interface TimeScale {
  topMin: number;
  bottomMin: number;
  totalPx: number;
  segments: TimeSegment[];
  /** Y offset of a minute within the scaled viewport. */
  minuteToY: (min: number) => number;
  /** Inverse: pointer Y → minute (clamped to axis). */
  yToMinute: (y: number) => number;
  /** Pixel height of [startMin, endMin) under the scale. */
  rangeHeight: (startMin: number, endMin: number) => number;
}

function gapId(startMin: number, endMin: number): string {
  return `${startMin}-${endMin}`;
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
 * Find compressible ranges: empty stretches (> threshold with zero lessons on
 * every visible day), expanded through abutting low-density runs (covered on
 * fewer than half the visible days) so a weekend-only blip doesn't keep a
 * weekday midday gap fully open.
 */
export function findCompressibleGaps(
  topMin: number,
  bottomMin: number,
  lessons: LessonCoverage[],
  dayCount: number,
  thresholdMin: number = EMPTY_GAP_THRESHOLD_MIN
): TimeRange[] {
  const coverage = buildCoverage(topMin, bottomMin, lessons, dayCount);
  if (coverage.length === 0) return [];

  // Sparse = covered on fewer than half the days (weekends-only midday, etc.).
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

  const gaps: TimeRange[] = [];
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
      gaps.push({ startMin: start, endMin: end });
    }
  }

  return mergeRanges(gaps);
}

/** Build ordered span/gap segments for the axis. */
export function buildSegments(
  topMin: number,
  bottomMin: number,
  gaps: TimeRange[],
  expandedIds: ReadonlySet<string>
): TimeSegment[] {
  const segments: TimeSegment[] = [];
  let cursor = topMin;

  for (const gap of gaps) {
    if (gap.startMin > cursor) {
      segments.push({ kind: "span", startMin: cursor, endMin: gap.startMin });
    }
    const id = gapId(gap.startMin, gap.endMin);
    segments.push({
      kind: "gap",
      id,
      startMin: gap.startMin,
      endMin: gap.endMin,
      collapsed: !expandedIds.has(id),
    });
    cursor = gap.endMin;
  }

  if (cursor < bottomMin) {
    segments.push({ kind: "span", startMin: cursor, endMin: bottomMin });
  }

  return segments;
}

function segmentHeight(seg: TimeSegment): number {
  if (seg.kind === "gap" && seg.collapsed) return COLLAPSED_BAND_PX;
  return (seg.endMin - seg.startMin) * PX_PER_MIN;
}

/** Piecewise linear scale: full px/min in spans, slim band for collapsed gaps. */
export function createTimeScale(
  topMin: number,
  bottomMin: number,
  gaps: TimeRange[],
  expandedIds: ReadonlySet<string>
): TimeScale {
  const segments = buildSegments(topMin, bottomMin, gaps, expandedIds);
  const totalPx = segments.reduce((sum, seg) => sum + segmentHeight(seg), 0);

  const minuteToY = (min: number): number => {
    const clamped = Math.max(topMin, Math.min(bottomMin, min));
    let y = 0;
    for (const seg of segments) {
      if (clamped <= seg.startMin) return y;
      if (clamped >= seg.endMin) {
        y += segmentHeight(seg);
        continue;
      }
      const frac = (clamped - seg.startMin) / (seg.endMin - seg.startMin || 1);
      return y + frac * segmentHeight(seg);
    }
    return y;
  };

  const yToMinute = (y: number): number => {
    const clampedY = Math.max(0, Math.min(totalPx, y));
    let cursor = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const h = segmentHeight(seg);
      const isLast = i === segments.length - 1;
      if (clampedY <= cursor + h || isLast) {
        const frac = h === 0 ? 0 : Math.min(1, Math.max(0, (clampedY - cursor) / h));
        return seg.startMin + frac * (seg.endMin - seg.startMin);
      }
      cursor += h;
    }
    return bottomMin;
  };

  const rangeHeight = (startMin: number, endMin: number): number =>
    Math.max(0, minuteToY(endMin) - minuteToY(startMin));

  return { topMin, bottomMin, totalPx, segments, minuteToY, yToMinute, rangeHeight };
}

/**
 * Default scroll anchor in absolute minutes: "now" when it falls inside an
 * active teaching span (not a compressible empty/sparse gap), otherwise the
 * week's earliest lesson start.
 */
export function defaultAnchorMin(
  lessons: TimeRange[],
  topMin: number,
  bottomMin: number,
  nowMin: number | null,
  gaps: TimeRange[] = []
): number {
  const inGap = (min: number) =>
    gaps.some((g) => min > g.startMin && min < g.endMin);

  if (
    nowMin !== null &&
    nowMin >= topMin &&
    nowMin <= bottomMin &&
    !inGap(nowMin)
  ) {
    return nowMin;
  }
  let first = Infinity;
  for (const l of lessons) {
    if (l.startMin < first) first = l.startMin;
  }
  if (Number.isFinite(first)) return first;
  return topMin;
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
