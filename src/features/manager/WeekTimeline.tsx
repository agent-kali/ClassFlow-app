"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatMin, nowMinOn, weekDates } from "@/domain/time";
import { layoutDay } from "./laneLayout";
import { LessonBlock } from "./LessonBlock";
import { TravelGapChip } from "./TravelGapChip";
import {
  AXIS_PADDING_PX,
  createTimeScale,
  defaultAnchorMin,
  findEmptySpans,
  tagLessonsWithDayIndex,
} from "./timeViewport";

const GUTTER_PX = 52;
/** Separate track for empty-span labels — never overlaps hour ticks. */
const GAP_TRACK_PX = 40;
const STICKY_HEADER_PX = 44;

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
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return parts.map((p) => p[0]).join("").slice(0, 3).toUpperCase();
  return name.slice(0, 3).toUpperCase();
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const anchoredWeekRef = useRef<string | null>(null);

  /** Stable guided-tour target: first scheduled LP12B01B @ 18:00 in the visible week. */
  const tourLessonId = useMemo(() => {
    const daySet = new Set(days);
    const candidates = lessons
      .filter((l) => {
        if (!daySet.has(l.date) || l.status !== "scheduled" || l.startMin !== 18 * 60) {
          return false;
        }
        return lookups.classGroupsById.get(l.classGroupId)?.code === "LP12B01B";
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
    return candidates[0]?.id ?? null;
  }, [days, lessons, lookups]);

  const [topMin, bottomMin] = useMemo(() => {
    let min = 9 * 60;
    let max = 18 * 60;
    for (const l of allLessons) {
      min = Math.min(min, l.startMin);
      max = Math.max(max, l.endMin);
    }
    return [Math.floor((min - 20) / 60) * 60, Math.ceil((max + 20) / 60) * 60];
  }, [allLessons]);

  const emptySpans = useMemo(() => {
    const tagged = tagLessonsWithDayIndex(allLessons, days);
    return findEmptySpans(topMin, bottomMin, tagged, days.length);
  }, [allLessons, days, topMin, bottomMin]);

  const scale = useMemo(() => createTimeScale(topMin, bottomMin), [topMin, bottomMin]);

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

  const lessonsById = useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const l of lessons) map.set(l.id, l);
    return map;
  }, [lessons]);

  const nowMin = nowMinOn(today, now);

  useEffect(() => {
    if (anchoredWeekRef.current === anchorDate) return;
    const el = scrollerRef.current;
    if (!el) return;
    anchoredWeekRef.current = anchorDate;

    const anchor = defaultAnchorMin(allLessons, topMin, bottomMin, nowMin);
    const anchorY = scale.minuteToY(anchor);
    const viewportLead = STICKY_HEADER_PX + AXIS_PADDING_PX + 16;
    el.scrollTop = Math.max(0, anchorY - viewportLead);
  }, [anchorDate, allLessons, topMin, bottomMin, nowMin, scale]);

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

  const focusedLessonIds = useMemo(() => {
    if (!focusedTravelKey) return null;
    const [a, b] = focusedTravelKey.split("|");
    return new Set([a, b]);
  }, [focusedTravelKey]);

  const gridCols = `${GUTTER_PX}px ${GAP_TRACK_PX}px repeat(7, minmax(0, 1fr))`;

  return (
    <div
      ref={scrollerRef}
      className="flex-1 overflow-auto"
      role="region"
      aria-label="Week schedule"
    >
      <div className="min-w-[880px]">
        {/* Day header */}
        <div
          className="sticky top-0 z-20 grid border-b border-line bg-surface"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div />
          <div className="border-l border-line-soft" />
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
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          {/* Hour gutter — tick labels only */}
          <div className="relative" style={{ height: scale.totalPx }}>
            {hours.map((m) => (
              <span
                key={m}
                className="cf-mono pointer-events-none absolute right-1.5 -translate-y-1/2 text-[10px] leading-none text-ink-faint"
                style={{ top: scale.minuteToY(m) }}
              >
                {formatMin(m)}
              </span>
            ))}
          </div>

          {/* Empty-span track — de-emphasis labels, separate from hour ticks */}
          <div className="relative border-l border-line-soft" style={{ height: scale.totalPx }}>
            {emptySpans.map((span) => (
              <div
                key={`${span.startMin}-${span.endMin}`}
                className="pointer-events-none absolute inset-x-0 flex items-center justify-center px-0.5"
                style={{
                  top: scale.minuteToY(span.startMin),
                  height: scale.rangeHeight(span.startMin, span.endMin),
                }}
              >
                <span className="cf-mono text-center text-[8px] leading-tight font-medium text-ink-faint">
                  {formatMin(span.startMin)}
                  <span className="block">–</span>
                  {formatMin(span.endMin)}
                </span>
              </div>
            ))}
          </div>

          {days.map((date) => {
            const dayLayout = byDay.get(date) ?? [];
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
                {hours.map((m) => (
                  <div
                    key={m}
                    className="pointer-events-none absolute inset-x-0 border-t border-line-soft"
                    style={{ top: scale.minuteToY(m) }}
                  />
                ))}

                {emptySpans.map((span) => (
                  <div
                    key={`${span.startMin}-${span.endMin}`}
                    className="pointer-events-none absolute inset-x-0 bg-ground/60"
                    style={{
                      top: scale.minuteToY(span.startMin),
                      height: scale.rangeHeight(span.startMin, span.endMin),
                    }}
                    aria-hidden
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
                  nowMin <= bottomMin && (
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

                {dayLayout.map(({ lesson, lane, laneCount }) => (
                  <LessonBlock
                    key={`${lesson.id}-${
                      focusedLessonIds?.has(lesson.id) ? travelFocusNonce : 0
                    }`}
                    lesson={lesson}
                    lane={lane}
                    laneCount={laneCount}
                    minuteToY={scale.minuteToY}
                    rangeHeight={scale.rangeHeight}
                    conflicts={conflictsByLesson.get(lesson.id) ?? []}
                    lookups={lookups}
                    selected={selectedLessonId === lesson.id}
                    travelHighlighted={focusedLessonIds?.has(lesson.id) ?? false}
                    tourTarget={lesson.id === tourLessonId}
                    onSelect={onSelectLesson}
                  />
                ))}

                {dayTravel.map((c) => {
                  const prev = lessonsById.get(c.lessonIds[0]);
                  const next = lessonsById.get(c.lessonIds[1]);
                  if (!prev || !next) return null;
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
