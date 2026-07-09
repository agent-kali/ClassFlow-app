"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatMin, nowMinOn, weekDates } from "@/domain/time";
import { layoutDay } from "./laneLayout";
import { LessonBlock, PX_PER_MIN } from "./LessonBlock";

const GUTTER_PX = 52;

interface Props {
  lessons: Lesson[];
  /** Unfiltered lessons, used to keep the time axis stable while filtering. */
  allLessons: Lesson[];
  /** Monday-anchored date of the week being viewed. */
  anchorDate: string;
  today: string;
  lookups: ReturnType<typeof useLookups>;
  conflictsByLesson: Map<string, Conflict[]>;
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

export function WeekTimeline({
  lessons,
  allLessons,
  anchorDate,
  today,
  lookups,
  conflictsByLesson,
  selectedLessonId,
  onSelectLesson,
  onCreateRange,
  snap = (m) => m,
}: Props) {
  const days = useMemo(() => weekDates(parseISO(anchorDate)), [anchorDate]);
  const now = useNowMinute();
  const [drag, setDrag] = useState<DragState | null>(null);

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

  const totalPx = (bottomMin - topMin) * PX_PER_MIN;
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

  const minFromPointer = (e: React.PointerEvent, el: HTMLElement): number => {
    const rect = el.getBoundingClientRect();
    const min = topMin + (e.clientY - rect.top) / PX_PER_MIN;
    return Math.max(topMin, Math.min(bottomMin, snap(min)));
  };

  const nowMin = nowMinOn(today, now);

  return (
    <div className="flex-1 overflow-auto" role="region" aria-label="Week schedule">
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
          <div className="relative" style={{ height: totalPx }}>
            {hours.map((m) => (
              <span
                key={m}
                className="cf-mono absolute right-1.5 -translate-y-1/2 text-[10px] text-ink-faint"
                style={{ top: (m - topMin) * PX_PER_MIN }}
              >
                {formatMin(m)}
              </span>
            ))}
          </div>

          {days.map((date) => {
            const laid = byDay.get(date) ?? [];
            const isToday = date === today;
            const dayDrag = drag?.date === date ? drag : null;
            return (
              <div
                key={date}
                className={`relative border-l border-line-soft ${isToday ? "bg-accent-soft/30" : ""}`}
                style={{ height: totalPx, touchAction: onCreateRange ? "pan-x" : undefined }}
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
                        if (end - start < 15) end = start + 60; // a click means "start here, one hour"
                        setDrag(null);
                        onCreateRange(date, start, end);
                      }
                    : undefined
                }
                onPointerCancel={onCreateRange ? () => setDrag(null) : undefined}
              >
                {/* Hour lines */}
                {hours.map((m) => (
                  <div
                    key={m}
                    className="pointer-events-none absolute inset-x-0 border-t border-line-soft"
                    style={{ top: (m - topMin) * PX_PER_MIN }}
                  />
                ))}

                {/* Drag-to-create ghost */}
                {dayDrag && dayDrag.currentMin !== dayDrag.anchorMin && (
                  <div
                    className="pointer-events-none absolute inset-x-0.5 z-10 rounded-sm border border-accent bg-accent-soft/70"
                    style={{
                      top: (Math.min(dayDrag.anchorMin, dayDrag.currentMin) - topMin) * PX_PER_MIN,
                      height:
                        Math.abs(dayDrag.currentMin - dayDrag.anchorMin) * PX_PER_MIN,
                    }}
                  >
                    <span className="cf-mono px-1 text-[10px] font-semibold text-accent">
                      {formatMin(Math.min(dayDrag.anchorMin, dayDrag.currentMin))}–
                      {formatMin(Math.max(dayDrag.anchorMin, dayDrag.currentMin))}
                    </span>
                  </div>
                )}

                {/* Now marker */}
                {isToday && nowMin !== null && nowMin >= topMin && nowMin <= bottomMin && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10"
                    style={{ top: (nowMin - topMin) * PX_PER_MIN }}
                  >
                    <div className="border-t-2 border-accent" />
                    <span className="cf-mono absolute -top-2 left-0.5 rounded-sm bg-accent px-1 text-[9px] font-bold text-accent-ink">
                      {formatMin(nowMin)}
                    </span>
                  </div>
                )}

                {laid.map(({ lesson, lane, laneCount }) => (
                  <LessonBlock
                    key={lesson.id}
                    lesson={lesson}
                    lane={lane}
                    laneCount={laneCount}
                    topMin={topMin}
                    conflicts={conflictsByLesson.get(lesson.id) ?? []}
                    lookups={lookups}
                    selected={selectedLessonId === lesson.id}
                    onSelect={onSelectLesson}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
