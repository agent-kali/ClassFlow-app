"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Lesson } from "@/domain/types";
import { detectConflicts, isTeacherOverlap, type Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatAgendaMin, formatDuration, nowMinOn } from "@/domain/time";
import { TOUR_BLOCK_ALL_LESSONS } from "@/features/tour/lessonLock";
import { DayLessonBlock } from "./DayLessonBlock";
import { travelGapKey, type TravelConflict } from "./travelGap";
import {
  DAY_BLOCK_HEIGHT,
  DAY_DRAG_THRESHOLD_PX,
  DAY_TRAVEL_BAND_HEIGHT,
  buildTeacherRows,
  buildTimeRules,
  buildTravelSegments,
  hourLabelStep,
  laneTop,
  minuteToFraction,
  proposeDragTime,
  pxPerMinute,
  resolveTimeWindow,
  rowHeight,
  spanToFraction,
  travelTier,
} from "./dayTimelineLayout";

interface Props {
  /** Already narrowed by the schedule filters; the whole week is fine. */
  lessons: Lesson[];
  date: string;
  today: string;
  teacherIds: string[];
  lookups: ReturnType<typeof useLookups>;
  conflictsByLesson: Map<string, Conflict[]>;
  travelConflicts?: TravelConflict[];
  focusedLessonIds?: string[] | null;
  focusNonce?: number;
  selectedLessonId?: string | null;
  lockLessonSelection?: string | null;
  onSelectLesson?: (lesson: Lesson, el: HTMLElement) => void;
  onMoveLesson?: (id: string, date: string, startMin: number, endMin: number) => void;
}

interface DragState {
  lesson: Lesson;
  lane: number;
  pointerId: number;
  startX: number;
  startY: number;
  activated: boolean;
  cancelled: boolean;
  deltaPx: number;
}

function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * The manager's Day View: one date, time running left to right, one row per
 * teacher. Two teachers at 18:00 are two rows; one teacher's two 18:00
 * lessons collide inside a single row. Geometry is computed from lesson data
 * alone — never from focus or selection — so highlighting a conflict cannot
 * move a card.
 */
export function DayTimeline({
  lessons,
  date,
  today,
  teacherIds,
  lookups,
  conflictsByLesson,
  travelConflicts = [],
  focusedLessonIds = null,
  focusNonce = 0,
  selectedLessonId = null,
  lockLessonSelection = null,
  onSelectLesson,
  onMoveLesson,
}: Props) {
  const now = useNowMinute();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const dayLessons = useMemo(() => lessons.filter((l) => l.date === date), [lessons, date]);

  const timeWindow = useMemo(() => resolveTimeWindow(dayLessons), [dayLessons]);
  const rows = useMemo(
    () => buildTeacherRows(teacherIds, dayLessons, timeWindow),
    [teacherIds, dayLessons, timeWindow]
  );
  const rules = useMemo(() => buildTimeRules(timeWindow), [timeWindow]);
  const pxPerMin = pxPerMinute(trackWidth, timeWindow);
  const labelStep = hourLabelStep(pxPerMin * 60);

  const tightTravelKeys = useMemo(
    () => new Set(travelConflicts.map(travelGapKey)),
    [travelConflicts]
  );

  const travelByTeacher = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildTravelSegments>>();
    for (const row of rows) {
      map.set(
        row.teacherId,
        buildTravelSegments(
          row.blocks.map((b) => b.lesson),
          (l) => lookups.roomsById.get(l.roomId)?.campusId,
          (l) => lookups.campusOfRoom(l.roomId)?.name,
          tightTravelKeys,
          timeWindow
        )
      );
    }
    return map;
  }, [rows, lookups, tightTravelKeys, timeWindow]);

  const focusedIds = useMemo(
    () => (focusedLessonIds ? new Set(focusedLessonIds) : null),
    [focusedLessonIds]
  );

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // clientWidth, not a bounding rect: it reports layout pixels even when an
    // ancestor is scaled, so the metadata tiers stay honest.
    const sync = () => setTrackWidth(el.clientWidth);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Bring a focused conflict into view without touching any card's geometry.
  useEffect(() => {
    if (!focusedLessonIds?.length || focusNonce === 0) return;
    const timer = window.setTimeout(() => {
      const el = scrollerRef.current?.querySelector(
        `[data-lesson-id="${CSS.escape(focusedLessonIds[0])}"]`
      );
      el?.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
    }, 30);
    return () => clearTimeout(timer);
  }, [focusedLessonIds, focusNonce]);

  const [drag, setDrag] = useState<DragState | null>(null);

  const preview = useMemo(() => {
    if (!drag?.activated || drag.cancelled || pxPerMin <= 0) return null;
    return proposeDragTime(drag.lesson, drag.deltaPx, pxPerMin, timeWindow);
  }, [drag, pxPerMin, timeWindow]);

  /**
   * What the drop would cause, decided by the real domain rules run over this
   * one day — which is as far as any conflict can reach.
   */
  const previewWarning = useMemo(() => {
    if (!drag || !preview) return null;
    const proposed = { ...drag.lesson, startMin: preview.startMin, endMin: preview.endMin };
    const found = detectConflicts(
      dayLessons.map((l) => (l.id === proposed.id ? proposed : l)),
      lookups.roomsById
    ).filter((c) => c.lessonIds.includes(proposed.id));
    if (found.some(isTeacherOverlap)) return "conflict" as const;
    if (found.some((c) => c.type === "travel")) return "travel" as const;
    return null;
  }, [drag, preview, dayLessons, lookups]);

  useEffect(() => {
    if (!drag) return;
    const { pointerId, startX, startY, activated, cancelled } = drag;

    const commit = (apply: boolean) => {
      setDrag(null);
      if (!activated) return;
      // Releasing fires a click on the card; swallow it so a move never also
      // opens the popover.
      suppressClickRef.current = true;
      requestAnimationFrame(() => {
        suppressClickRef.current = false;
      });
      if (!apply || cancelled || !onMoveLesson || pxPerMin <= 0) return;
      const next = proposeDragTime(drag.lesson, drag.deltaPx, pxPerMin, timeWindow);
      if (next.startMin === drag.lesson.startMin) return;
      onMoveLesson(drag.lesson.id, drag.lesson.date, next.startMin, next.endMin);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId || cancelled) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!activated && Math.hypot(dx, dy) < DAY_DRAG_THRESHOLD_PX) return;
      setDrag((d) =>
        d && d.pointerId === pointerId ? { ...d, activated: true, deltaPx: dx } : d
      );
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === pointerId) commit(true);
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === pointerId) commit(false);
    };
    // Escape abandons the move at once; the drag stays alive until the pointer
    // is released so the click that follows is still swallowed.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !activated || cancelled) return;
      e.preventDefault();
      setDrag((d) => (d && d.pointerId === pointerId ? { ...d, cancelled: true } : d));
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drag, pxPerMin, timeWindow, onMoveLesson]);

  const handleSelect = onSelectLesson
    ? (lesson: Lesson, el: HTMLElement) => {
        if (suppressClickRef.current) return;
        if (lockLessonSelection === TOUR_BLOCK_ALL_LESSONS) return;
        if (lockLessonSelection && lesson.id !== lockLessonSelection) return;
        onSelectLesson(lesson, el);
      }
    : undefined;

  const startDrag = onMoveLesson
    ? (lesson: Lesson, e: React.PointerEvent<HTMLElement>, lane: number) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({
          lesson,
          lane,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          activated: false,
          cancelled: false,
          deltaPx: 0,
        });
      }
    : undefined;

  const nowMinToday = nowMinOn(today, now);
  const nowMinHere = nowMinOn(date, now);
  const nowFraction =
    nowMinHere !== null && nowMinHere >= timeWindow.startMin && nowMinHere <= timeWindow.endMin
      ? minuteToFraction(nowMinHere, timeWindow)
      : null;

  const ghostSpan = preview
    ? spanToFraction(preview.startMin, preview.endMin, timeWindow)
    : null;

  return (
    <div
      ref={scrollerRef}
      className="day-timeline flex-1 overflow-y-auto overflow-x-hidden"
      role="region"
      aria-label={`Day schedule, ${date}`}
    >
      <div className="day-timeline__head">
        <div className="day-timeline__corner">
          <span className="cf-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Teacher
          </span>
        </div>
        <div ref={trackRef} className="day-timeline__times">
          {rules.map((rule) => (
            <span
              key={rule.min}
              className={`day-timeline__tick ${rule.major ? "day-timeline__tick--major" : ""}`}
              style={{ left: `${rule.fraction * 100}%` }}
            >
              {rule.major && (rule.min / 60) % labelStep === 0 && (
                <span className="day-timeline__tick-label cf-mono">
                  {formatAgendaMin(rule.min)}
                </span>
              )}
            </span>
          ))}
          {nowFraction !== null && (
            <span
              className="day-timeline__now-head"
              style={{ left: `${nowFraction * 100}%` }}
              aria-hidden
            />
          )}
        </div>
      </div>

      {rows.map((row) => {
        const teacher = lookups.teachersById.get(row.teacherId);
        const segments = travelByTeacher.get(row.teacherId) ?? [];
        const dragging = drag && drag.lesson.teacherId === row.teacherId ? drag : null;

        return (
          <div
            key={row.teacherId}
            className="day-timeline__row"
            style={{ height: rowHeight(row.laneCount) }}
            data-teacher-id={row.teacherId}
          >
            <div className="day-timeline__teacher">
              <span className="day-timeline__teacher-code cf-mono">{teacher?.code ?? "—"}</span>
              <span className="day-timeline__teacher-name">{teacher?.name ?? ""}</span>
              <span className="day-timeline__teacher-count cf-mono">
                {row.blocks.length === 0
                  ? "free"
                  : `${row.blocks.length} lesson${row.blocks.length > 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="day-timeline__track">
              {rules.map((rule) => (
                <span
                  key={rule.min}
                  className={`day-timeline__rule ${rule.major ? "day-timeline__rule--major" : ""}`}
                  style={{ left: `${rule.fraction * 100}%` }}
                  aria-hidden
                />
              ))}
              {nowFraction !== null && (
                <span
                  className="day-timeline__now"
                  style={{ left: `${nowFraction * 100}%` }}
                  aria-hidden
                />
              )}

              {segments.map((segment) => {
                const tier = travelTier(segment.width * trackWidth);
                const gap = formatDuration(segment.gapMin);
                const full = `${segment.fromCampus} → ${segment.toCampus} · ${gap}`;
                return (
                  <span
                    key={segment.key}
                    className="day-timeline__travel"
                    data-tight={segment.tight || undefined}
                    data-tier={tier}
                    data-travel-gap={segment.key}
                    style={{
                      left: `${segment.left * 100}%`,
                      width: `${segment.width * 100}%`,
                      top:
                        laneTop(0, row.laneCount) +
                        (DAY_BLOCK_HEIGHT - DAY_TRAVEL_BAND_HEIGHT) / 2,
                      height: DAY_TRAVEL_BAND_HEIGHT,
                    }}
                    title={`${segment.tight ? "Tight travel" : "Campus change"} — ${full}`}
                    aria-label={`${segment.tight ? "Tight travel" : "Campus change"}, ${full}`}
                  >
                    <span className="day-timeline__travel-label cf-mono">
                      {tier === "wide" ? full : tier === "medium" ? gap : ""}
                    </span>
                  </span>
                );
              })}

              {row.blocks.length === 0 && (
                <span className="day-timeline__free">No lessons</span>
              )}

              {row.blocks.map((block) => (
                <DayLessonBlock
                  key={block.lesson.id}
                  block={block}
                  laneCount={row.laneCount}
                  trackWidthPx={trackWidth}
                  conflicts={conflictsByLesson.get(block.lesson.id) ?? []}
                  lookups={lookups}
                  today={today}
                  nowMin={nowMinToday}
                  isSelected={selectedLessonId === block.lesson.id}
                  isFocused={focusedIds?.has(block.lesson.id) ?? false}
                  isDragging={!!ghostSpan && drag?.lesson.id === block.lesson.id}
                  onSelect={handleSelect}
                  onDragStart={
                    startDrag ? (lesson, e) => startDrag(lesson, e, block.lane) : undefined
                  }
                />
              ))}

              {ghostSpan && dragging && preview && (
                <span
                  className="day-timeline__ghost"
                  data-warning={previewWarning ?? undefined}
                  style={{
                    left: `${ghostSpan.left * 100}%`,
                    width: `${ghostSpan.width * 100}%`,
                    top: laneTop(dragging.lane, row.laneCount),
                    height: DAY_BLOCK_HEIGHT,
                  }}
                  aria-hidden
                >
                  <span className="day-timeline__ghost-label cf-mono">
                    {formatAgendaMin(preview.startMin)}–{formatAgendaMin(preview.endMin)}
                    {previewWarning === "conflict" && " · double booking"}
                    {previewWarning === "travel" && " · tight travel"}
                  </span>
                </span>
              )}
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="day-timeline__vacant">
          No teachers selected. Pick a teacher in the filters to see the day.
        </div>
      )}
    </div>
  );
}
