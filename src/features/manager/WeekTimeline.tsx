"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatMin, nowMinOn, weekDates } from "@/domain/time";
import { layoutDay } from "./laneLayout";
import { LessonBlock } from "./LessonBlock";
import { OverflowChip } from "./OverflowChip";
import { TravelGapChip } from "./TravelGapChip";
import {
  createTimeScale,
  defaultAnchorMin,
  findCompressibleGaps,
  tagLessonsWithDayIndex,
} from "./timeViewport";

const GUTTER_PX = 52;

export type TravelConflict = Extract<Conflict, { type: "travel" }>;

export function travelGapKey(c: Pick<TravelConflict, "lessonIds">): string {
  return `${c.lessonIds[0]}|${c.lessonIds[1]}`;
}

interface Props {
  lessons: Lesson[];
  /** Unfiltered lessons, used to keep the time axis stable while filtering. */
  allLessons: Lesson[];
  /** Monday-anchored date of the week being viewed. */
  anchorDate: string;
  today: string;
  lookups: ReturnType<typeof useLookups>;
  conflictsByLesson: Map<string, Conflict[]>;
  travelConflicts?: TravelConflict[];
  focusedTravelKey?: string | null;
  travelFocusNonce?: number;
  onFocusTravelGap?: (key: string) => void;
  selectedLessonId?: string | null;
  onSelectLesson?: (lesson: Lesson, el: HTMLElement) => void;
  /** Drag-to-create on empty ruler space (already snapped). */
  onCreateRange?: (date: string, startMin: number, endMin: number) => void;
  snap?: (min: number) => number;
}

function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

interface DragState {
  date: string;
  anchorMin: number;
  currentMin: number;
}

function campusShort(name: string | undefined): string {
  if (!name) return "?";
  // Prefer well-known initials when the full campus name is long.
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return parts.map((p) => p[0]).join("").slice(0, 3).toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

/** True when a minute range's midpoint sits inside a collapsed empty band. */
function midInCollapsedGap(
  startMin: number,
  endMin: number,
  gaps: { startMin: number; endMin: number }[]
): boolean {
  const mid = (startMin + endMin) / 2;
  return gaps.some((g) => mid > g.startMin && mid < g.endMin);
}

export function WeekTimeline({
  lessons,
  allLessons,
  anchorDate,
  today,
  lookups,
  conflictsByLesson,
  travelConflicts = [],
  focusedTravelKey = null,
  travelFocusNonce = 0,
  onFocusTravelGap,
  selectedLessonId,
  onSelectLesson,
  onCreateRange,
  snap = (m) => m,
}: Props) {
  const days = useMemo(() => weekDates(parseISO(anchorDate)), [anchorDate]);
  const now = useNowMinute();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(() => new Set());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const anchoredWeekRef = useRef<string | null>(null);

  // Stable axis: fit the whole (unfiltered) week with breathing room.
  const [topMin, bottomMin] = useMemo(() => {
    let min = 9 * 60;
    let max = 18 * 60;
    for (const l of allLessons) {
      min = Math.min(min, l.startMin);
      max = Math.max(max, l.endMin);
    }
    return [Math.floor((min - 20) / 60) * 60, Math.ceil((max + 20) / 60) * 60];
  }, [allLessons]);

  // Reset collapsed-band expands when the week/axis identity changes.
  const gapEpoch = `${anchorDate}:${topMin}:${bottomMin}`;
  const [gapEpochSeen, setGapEpochSeen] = useState(gapEpoch);
  if (gapEpochSeen !== gapEpoch) {
    setGapEpochSeen(gapEpoch);
    setExpandedGaps(new Set());
  }

  const gaps = useMemo(() => {
    const tagged = tagLessonsWithDayIndex(allLessons, days);
    return findCompressibleGaps(topMin, bottomMin, tagged, days.length);
  }, [allLessons, days, topMin, bottomMin]);

  const lessonsById = useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const l of lessons) map.set(l.id, l);
    return map;
  }, [lessons]);

  // When a travel gap is focused inside a folded band, treat that band as expanded
  // for this render so the chip exists to scroll to — without an effect setState.
  const focusExpandedId = useMemo(() => {
    if (!focusedTravelKey || travelFocusNonce === 0) return null;
    const conflict = travelConflicts.find((c) => travelGapKey(c) === focusedTravelKey);
    if (!conflict) return null;
    const prevLesson = lessonsById.get(conflict.lessonIds[0]);
    const nextLesson = lessonsById.get(conflict.lessonIds[1]);
    if (!prevLesson || !nextLesson) return null;
    const mid = (prevLesson.endMin + nextLesson.startMin) / 2;
    const covering = gaps.find((g) => mid > g.startMin && mid < g.endMin);
    return covering ? `${covering.startMin}-${covering.endMin}` : null;
  }, [focusedTravelKey, travelFocusNonce, travelConflicts, lessonsById, gaps]);

  const effectiveExpandedGaps = useMemo(() => {
    if (!focusExpandedId || expandedGaps.has(focusExpandedId)) return expandedGaps;
    const next = new Set(expandedGaps);
    next.add(focusExpandedId);
    return next;
  }, [expandedGaps, focusExpandedId]);

  const scale = useMemo(
    () => createTimeScale(topMin, bottomMin, gaps, effectiveExpandedGaps),
    [topMin, bottomMin, gaps, effectiveExpandedGaps]
  );

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let m = Math.ceil(topMin / 60) * 60; m <= bottomMin; m += 60) list.push(m);
    return list;
  }, [topMin, bottomMin]);

  const byDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof layoutDay>>();
    for (const date of days) {
      map.set(date, layoutDay(lessons.filter((l) => l.date === date)));
    }
    return map;
  }, [lessons, days]);

  const nowMin = nowMinOn(today, now);

  useEffect(() => {
    if (anchoredWeekRef.current === anchorDate) return;
    const el = scrollerRef.current;
    if (!el) return;
    anchoredWeekRef.current = anchorDate;

    const anchor = defaultAnchorMin(allLessons, topMin, bottomMin, nowMin, gaps);
    const headerAir = 40;
    el.scrollTop = Math.max(0, scale.minuteToY(anchor) - headerAir);
  }, [anchorDate, allLessons, topMin, bottomMin, nowMin, scale, gaps]);

  // Scroll focused travel gap into view (band already expanded via effectiveExpandedGaps).
  useEffect(() => {
    if (!focusedTravelKey || travelFocusNonce === 0) return;
    const t = requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector(
        `[data-travel-gap="${CSS.escape(focusedTravelKey)}"]`
      );
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(t);
  }, [focusedTravelKey, travelFocusNonce, scale.totalPx]);

  const minFromPointer = (e: React.PointerEvent, el: HTMLElement): number => {
    const rect = el.getBoundingClientRect();
    const min = scale.yToMinute(e.clientY - rect.top);
    return Math.max(topMin, Math.min(bottomMin, snap(min)));
  };

  const toggleGap = (id: string) => {
    setExpandedGaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapsedGaps = scale.segments.filter(
    (s): s is Extract<typeof s, { kind: "gap" }> => s.kind === "gap" && s.collapsed
  );
  const expandedGapSegs = scale.segments.filter(
    (s): s is Extract<typeof s, { kind: "gap" }> => s.kind === "gap" && !s.collapsed
  );

  const focusedLessonIds = useMemo(() => {
    if (!focusedTravelKey) return null;
    const [a, b] = focusedTravelKey.split("|");
    return new Set([a, b]);
  }, [focusedTravelKey]);

  return (
    <div
      ref={scrollerRef}
      className="flex-1 overflow-auto"
      role="region"
      aria-label="Week schedule"
    >
      <div className="min-w-[840px]">
        {/* Day header */}
        <div
          className="sticky top-0 z-20 grid border-b border-line bg-surface"
          style={{ gridTemplateColumns: `${GUTTER_PX}px repeat(7, minmax(0, 1fr))` }}
        >
          <div />
          {days.map((date) => {
            const isToday = date === today;
            const d = parseISO(date);
            return (
              <div
                key={date}
                className={`border-l border-line-soft px-2 py-1.5 ${isToday ? "bg-accent-soft" : ""}`}
              >
                <span className={`cf-mono text-[11px] font-semibold uppercase ${isToday ? "text-accent" : "text-ink-mute"}`}>
                  {format(d, "EEE")}
                </span>
                <span className={`cf-mono ml-1.5 text-[11px] ${isToday ? "text-accent" : "text-ink-faint"}`}>
                  {format(d, "dd/MM")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ruler body */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `${GUTTER_PX}px repeat(7, minmax(0, 1fr))` }}
        >
          {/* Hour gutter */}
          <div className="relative" style={{ height: scale.totalPx }}>
            {hours.map((m) => {
              // Hide labels inside or on the edge of a collapsed band — the band carries the range.
              const inCollapsed = collapsedGaps.some(
                (g) => m >= g.startMin && m <= g.endMin
              );
              if (inCollapsed) return null;
              return (
                <span
                  key={m}
                  className="cf-mono absolute right-1.5 -translate-y-1/2 text-[10px] text-ink-faint"
                  style={{ top: scale.minuteToY(m) }}
                >
                  {formatMin(m)}
                </span>
              );
            })}
            {collapsedGaps.map((g) => {
              const tucked = allLessons.filter((l) =>
                midInCollapsedGap(l.startMin, l.endMin, [g])
              ).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGap(g.id)}
                  title={`Expand ${formatMin(g.startMin)}–${formatMin(g.endMin)}`}
                  className="cf-mono absolute right-0 left-0 z-10 flex items-center justify-end gap-1 pr-1 text-[9px] font-semibold text-ink-mute hover:text-accent"
                  style={{
                    top: scale.minuteToY(g.startMin),
                    height: scale.rangeHeight(g.startMin, g.endMin),
                  }}
                >
                  <span>
                    {formatMin(g.startMin)}–{formatMin(g.endMin)}
                  </span>
                  {tucked > 0 && <span className="text-ink-faint">·{tucked}</span>}
                </button>
              );
            })}
            {expandedGapSegs.map((g) => (
              <button
                key={`collapse-${g.id}`}
                type="button"
                onClick={() => toggleGap(g.id)}
                title={`Collapse ${formatMin(g.startMin)}–${formatMin(g.endMin)}`}
                className="cf-mono absolute right-1 z-10 -translate-y-1/2 rounded-sm border border-line-soft bg-surface px-1 text-[9px] font-semibold text-ink-faint hover:border-ink-faint hover:text-ink-mute"
                style={{ top: scale.minuteToY(g.startMin) }}
              >
                fold
              </button>
            ))}
          </div>

          {days.map((date) => {
            const dayLayout = byDay.get(date) ?? { visible: [], overflow: [] };
            const isToday = date === today;
            const dayDrag = drag?.date === date ? drag : null;
            const dayTravel = travelConflicts.filter((c) => {
              const prev = lessonsById.get(c.lessonIds[0]);
              return prev?.date === date;
            });

            return (
              <div
                key={date}
                className={`relative overflow-x-clip border-l border-line-soft ${isToday ? "bg-accent-soft/30" : ""}`}
                style={{ height: scale.totalPx, touchAction: onCreateRange ? "pan-x" : undefined }}
                onPointerDown={
                  onCreateRange
                    ? (e) => {
                        if (e.target !== e.currentTarget || e.button !== 0) return;
                        const min = minFromPointer(e, e.currentTarget);
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDrag({ date, anchorMin: min, currentMin: min });
                      }
                    : undefined
                }
                onPointerMove={
                  onCreateRange
                    ? (e) => {
                        if (!dayDrag) return;
                        const min = minFromPointer(e, e.currentTarget);
                        setDrag({ ...dayDrag, currentMin: min });
                      }
                    : undefined
                }
                onPointerUp={
                  onCreateRange
                    ? () => {
                        if (!dayDrag) return;
                        const start = Math.min(dayDrag.anchorMin, dayDrag.currentMin);
                        let end = Math.max(dayDrag.anchorMin, dayDrag.currentMin);
                        if (end - start < 15) end = start + 60;
                        setDrag(null);
                        onCreateRange(date, start, end);
                      }
                    : undefined
                }
                onPointerCancel={onCreateRange ? () => setDrag(null) : undefined}
              >
                {hours.map((m) => {
                  const inCollapsed = collapsedGaps.some(
                    (g) => m >= g.startMin && m <= g.endMin
                  );
                  if (inCollapsed) return null;
                  return (
                    <div
                      key={m}
                      className="pointer-events-none absolute inset-x-0 border-t border-line-soft"
                      style={{ top: scale.minuteToY(m) }}
                    />
                  );
                })}

                {collapsedGaps.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGap(g.id)}
                    aria-label={`Expand empty range ${formatMin(g.startMin)} to ${formatMin(g.endMin)}`}
                    className="absolute inset-x-0 z-[5] border-y border-dashed border-line-soft bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,var(--line-soft)_3px,var(--line-soft)_6px)] hover:bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,var(--line)_3px,var(--line)_6px)]"
                    style={{
                      top: scale.minuteToY(g.startMin),
                      height: scale.rangeHeight(g.startMin, g.endMin),
                    }}
                  />
                ))}

                {dayDrag && dayDrag.currentMin !== dayDrag.anchorMin && (
                  <div
                    className="pointer-events-none absolute inset-x-0.5 z-10 rounded-sm border border-accent bg-accent-soft/70"
                    style={{
                      top: scale.minuteToY(Math.min(dayDrag.anchorMin, dayDrag.currentMin)),
                      height: scale.rangeHeight(
                        Math.min(dayDrag.anchorMin, dayDrag.currentMin),
                        Math.max(dayDrag.anchorMin, dayDrag.currentMin)
                      ),
                    }}
                  >
                    <span className="cf-mono px-1 text-[10px] font-semibold text-accent">
                      {formatMin(Math.min(dayDrag.anchorMin, dayDrag.currentMin))}–
                      {formatMin(Math.max(dayDrag.anchorMin, dayDrag.currentMin))}
                    </span>
                  </div>
                )}

                {isToday &&
                  nowMin !== null &&
                  nowMin >= topMin &&
                  nowMin <= bottomMin &&
                  !collapsedGaps.some((g) => nowMin > g.startMin && nowMin < g.endMin) && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10"
                      style={{ top: scale.minuteToY(nowMin) }}
                    >
                      <div className="border-t-2 border-accent" />
                      <span className="cf-mono absolute -top-2 left-0.5 rounded-sm bg-accent px-1 text-[9px] font-bold text-accent-ink">
                        {formatMin(nowMin)}
                      </span>
                    </div>
                  )}

                {dayLayout.visible.map(({ lesson, lane, laneCount, hasOverflow }) => {
                  if (midInCollapsedGap(lesson.startMin, lesson.endMin, collapsedGaps)) {
                    return null;
                  }
                  return (
                    <LessonBlock
                      key={`${lesson.id}-${
                        focusedLessonIds?.has(lesson.id) ? travelFocusNonce : 0
                      }`}
                      lesson={lesson}
                      lane={lane}
                      laneCount={laneCount}
                      hasOverflow={hasOverflow}
                      minuteToY={scale.minuteToY}
                      rangeHeight={scale.rangeHeight}
                      conflicts={conflictsByLesson.get(lesson.id) ?? []}
                      lookups={lookups}
                      selected={selectedLessonId === lesson.id}
                      travelHighlighted={focusedLessonIds?.has(lesson.id) ?? false}
                      onSelect={onSelectLesson}
                    />
                  );
                })}

                {dayLayout.overflow.map((group) => {
                  if (midInCollapsedGap(group.startMin, group.endMin, collapsedGaps)) {
                    return null;
                  }
                  return (
                    <OverflowChip
                      key={group.id}
                      group={group}
                      minuteToY={scale.minuteToY}
                      rangeHeight={scale.rangeHeight}
                      lookups={lookups}
                      onSelect={onSelectLesson}
                    />
                  );
                })}

                {dayTravel.map((c) => {
                  const prev = lessonsById.get(c.lessonIds[0]);
                  const next = lessonsById.get(c.lessonIds[1]);
                  if (!prev || !next) return null;
                  if (midInCollapsedGap(prev.endMin, next.startMin, collapsedGaps)) {
                    return null;
                  }
                  const fromCampus = lookups.campusOfRoom(prev.roomId);
                  const toCampus = lookups.campusOfRoom(next.roomId);
                  const teacher = lookups.teachersById.get(c.teacherId);
                  const key = travelGapKey(c);
                  return (
                    <TravelGapChip
                      key={`${key}-${focusedTravelKey === key ? travelFocusNonce : 0}`}
                      gapKey={key}
                      gapMin={c.gapMin}
                      gapStartMin={prev.endMin}
                      gapEndMin={next.startMin}
                      minuteToY={scale.minuteToY}
                      fromCampus={campusShort(fromCampus?.name)}
                      toCampus={campusShort(toCampus?.name)}
                      teacherCode={teacher?.code ?? "?"}
                      highlighted={focusedTravelKey === key}
                      onActivate={() => onFocusTravelGap?.(key)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
