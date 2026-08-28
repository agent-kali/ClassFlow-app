import type { Lesson } from "@/domain/types";
import { snapMin } from "@/domain/time";
import { sortLessonsChronologically } from "./lessonCardModel";

/**
 * Geometry for the manager Day View: a resource timeline where time runs
 * horizontally and each teacher owns a row. Every number here is derived from
 * lesson data alone — never from selection, focus, or hover — so focusing a
 * conflict can never move a card.
 */

export interface TimeWindow {
  startMin: number;
  endMin: number;
}

/** 07:30–21:00 covers an ordinary teaching day; real lessons widen it. */
export const DEFAULT_DAY_WINDOW: TimeWindow = { startMin: 7 * 60 + 30, endMin: 21 * 60 };

/** The window only ever grows, and only to a clean half hour. */
const WINDOW_STEP_MINUTES = 30;

export const DAY_ROW_MIN_HEIGHT = 80;
export const DAY_BLOCK_HEIGHT = 52;
export const DAY_LANE_GAP = 6;
export const DAY_ROW_PAD_Y = 10;
export const DAY_TRAVEL_BAND_HEIGHT = 16;

/** Pointer travel before a press becomes a drag rather than a click. */
export const DAY_DRAG_THRESHOLD_PX = 8;

function floorTo(min: number, step: number): number {
  return Math.floor(min / step) * step;
}

function ceilTo(min: number, step: number): number {
  return Math.ceil(min / step) * step;
}

/**
 * The visible span. Starts at the default and expands outward to the nearest
 * half hour for anything that falls outside it — a lesson is never cropped.
 */
export function resolveTimeWindow(
  lessons: Lesson[],
  base: TimeWindow = DEFAULT_DAY_WINDOW
): TimeWindow {
  let { startMin, endMin } = base;
  for (const lesson of lessons) {
    if (lesson.startMin < startMin) startMin = floorTo(lesson.startMin, WINDOW_STEP_MINUTES);
    if (lesson.endMin > endMin) endMin = ceilTo(lesson.endMin, WINDOW_STEP_MINUTES);
  }
  return { startMin: Math.max(0, startMin), endMin: Math.min(24 * 60, endMin) };
}

export function windowMinutes(window: TimeWindow): number {
  return Math.max(1, window.endMin - window.startMin);
}

/** Minutes from midnight → 0..1 across the window. */
export function minuteToFraction(min: number, window: TimeWindow): number {
  return (min - window.startMin) / windowMinutes(window);
}

/** A time span → its left edge and width as fractions of the window. */
export function spanToFraction(
  startMin: number,
  endMin: number,
  window: TimeWindow
): { left: number; width: number } {
  const left = minuteToFraction(startMin, window);
  const right = minuteToFraction(endMin, window);
  return { left, width: Math.max(0, right - left) };
}

export function pxPerMinute(trackWidthPx: number, window: TimeWindow): number {
  return trackWidthPx / windowMinutes(window);
}

export interface DayBlock {
  lesson: Lesson;
  /** Sublane inside the teacher's row; 0 unless this lesson overlaps a sibling. */
  lane: number;
  left: number;
  width: number;
}

export interface DayTeacherRow {
  teacherId: string;
  laneCount: number;
  blocks: DayBlock[];
}

/**
 * One row per teacher, in the order given. Overlap is resolved per teacher:
 * two teachers at 18:00 are simply two rows, while one teacher's two 18:00
 * lessons stack into sublanes inside that teacher's row.
 */
export function buildTeacherRows(
  teacherIds: string[],
  lessons: Lesson[],
  window: TimeWindow
): DayTeacherRow[] {
  const byTeacher = new Map<string, Lesson[]>();
  for (const id of teacherIds) byTeacher.set(id, []);
  for (const lesson of lessons) {
    const list = byTeacher.get(lesson.teacherId);
    if (list) list.push(lesson);
  }

  return teacherIds.map((teacherId) => {
    const sorted = sortLessonsChronologically(byTeacher.get(teacherId) ?? []);
    const blocks: DayBlock[] = [];
    let laneCount = 0;

    // Lanes are reused across clusters: once every lane is free again the next
    // lesson falls back to lane 0, so an isolated lesson is never indented.
    let laneEnds: number[] = [];
    for (const lesson of sorted) {
      if (laneEnds.every((end) => end <= lesson.startMin)) laneEnds = [];
      let lane = laneEnds.findIndex((end) => end <= lesson.startMin);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = lesson.endMin;
      laneCount = Math.max(laneCount, laneEnds.length);
      const { left, width } = spanToFraction(lesson.startMin, lesson.endMin, window);
      blocks.push({ lesson, lane, left, width });
    }

    return { teacherId, laneCount: Math.max(1, laneCount), blocks };
  });
}

export function rowHeight(laneCount: number): number {
  const lanes = Math.max(1, laneCount);
  const stack = lanes * DAY_BLOCK_HEIGHT + (lanes - 1) * DAY_LANE_GAP;
  return Math.max(DAY_ROW_MIN_HEIGHT, stack + DAY_ROW_PAD_Y * 2);
}

/** Offset of a sublane from the top of its row; the stack is vertically centred. */
export function laneTop(lane: number, laneCount: number): number {
  const lanes = Math.max(1, laneCount);
  const stack = lanes * DAY_BLOCK_HEIGHT + (lanes - 1) * DAY_LANE_GAP;
  const offset = (rowHeight(lanes) - stack) / 2;
  return offset + lane * (DAY_BLOCK_HEIGHT + DAY_LANE_GAP);
}

export interface DayTravelSegment {
  key: string;
  teacherId: string;
  fromCampus: string;
  toCampus: string;
  gapMin: number;
  /** Set from the domain's travel conflicts — this module owns no threshold. */
  tight: boolean;
  left: number;
  width: number;
}

/**
 * The campus hops inside one teacher's day. A segment exists only where the
 * campus actually changes; whether that hop is *tight* is decided by
 * `detectConflicts` upstream and passed in as `tightKeys`.
 */
export function buildTravelSegments(
  teacherLessons: Lesson[],
  campusIdOf: (lesson: Lesson) => string | undefined,
  campusNameOf: (lesson: Lesson) => string | undefined,
  tightKeys: Set<string>,
  window: TimeWindow
): DayTravelSegment[] {
  const active = sortLessonsChronologically(
    teacherLessons.filter((l) => l.status === "scheduled")
  );
  const segments: DayTravelSegment[] = [];

  for (let i = 0; i < active.length - 1; i++) {
    const prev = active[i];
    const next = active[i + 1];
    const gapMin = next.startMin - prev.endMin;
    // A negative gap is a double-booking, not a journey.
    if (gapMin < 0) continue;
    const from = campusIdOf(prev);
    const to = campusIdOf(next);
    if (!from || !to || from === to) continue;

    const { left, width } = spanToFraction(prev.endMin, next.startMin, window);
    segments.push({
      key: `${prev.id}|${next.id}`,
      teacherId: prev.teacherId,
      fromCampus: campusNameOf(prev) ?? from,
      toCampus: campusNameOf(next) ?? to,
      gapMin,
      tight: tightKeys.has(`${prev.id}|${next.id}`),
      left,
      width,
    });
  }

  return segments;
}

/** Horizontal pointer travel → a start-time delta on the 5-minute grid. */
export function snapDragMinutes(deltaPx: number, pxPerMin: number): number {
  if (!Number.isFinite(pxPerMin) || pxPerMin <= 0) return 0;
  return snapMin(deltaPx / pxPerMin);
}

/** Keeps a lesson inside the visible window without ever changing its duration. */
export function clampToWindow(
  startMin: number,
  durationMin: number,
  window: TimeWindow
): number {
  const latest = window.endMin - durationMin;
  if (latest <= window.startMin) return window.startMin;
  return Math.min(Math.max(startMin, window.startMin), latest);
}

/**
 * Where a drag would land. Duration, date, teacher and room are untouched —
 * only the start moves, and only in 5-minute steps.
 */
export function proposeDragTime(
  lesson: Pick<Lesson, "startMin" | "endMin">,
  deltaPx: number,
  pxPerMin: number,
  window: TimeWindow
): { startMin: number; endMin: number } {
  const duration = lesson.endMin - lesson.startMin;
  const startMin = clampToWindow(
    snapMin(lesson.startMin + snapDragMinutes(deltaPx, pxPerMin)),
    duration,
    window
  );
  return { startMin, endMin: startMin + duration };
}

/** How much of a lesson's detail a block of this pixel width can carry. */
export type DayBlockTier = "full" | "medium" | "narrow" | "bare";

export const TIER_FULL_PX = 140;
export const TIER_MEDIUM_PX = 88;
export const TIER_NARROW_PX = 44;

/** A conflict is only spelled out where the words fit beside the time range. */
export const TIER_STATUS_PX = 176;

export function metadataTier(pxWidth: number): DayBlockTier {
  if (pxWidth >= TIER_FULL_PX) return "full";
  if (pxWidth >= TIER_MEDIUM_PX) return "medium";
  if (pxWidth >= TIER_NARROW_PX) return "narrow";
  return "bare";
}

/** How much of a travel segment's story fits in its real time gap. */
export type DayTravelTier = "wide" | "medium" | "narrow";

export const TRAVEL_WIDE_PX = 118;
export const TRAVEL_MEDIUM_PX = 54;

export function travelTier(pxWidth: number): DayTravelTier {
  if (pxWidth >= TRAVEL_WIDE_PX) return "wide";
  if (pxWidth >= TRAVEL_MEDIUM_PX) return "medium";
  return "narrow";
}

export interface TimeRule {
  min: number;
  fraction: number;
  major: boolean;
}

/**
 * How many hours apart the header labels stand. Every hour where they fit,
 * thinning out on a narrow desktop so the times never collide.
 */
export function hourLabelStep(pxPerHour: number): number {
  if (pxPerHour >= 46) return 1;
  if (pxPerHour >= 24) return 2;
  return 3;
}

/** Hour rules and much lighter half-hour rules across the window. */
export function buildTimeRules(window: TimeWindow): TimeRule[] {
  const rules: TimeRule[] = [];
  const first = ceilTo(window.startMin, WINDOW_STEP_MINUTES);
  for (let min = first; min <= window.endMin; min += WINDOW_STEP_MINUTES) {
    rules.push({ min, fraction: minuteToFraction(min, window), major: min % 60 === 0 });
  }
  return rules;
}
