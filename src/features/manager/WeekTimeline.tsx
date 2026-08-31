"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { nowMinOn, weekDates } from "@/domain/time";
import { LessonBlock } from "./LessonBlock";
import { TOUR_BLOCK_ALL_LESSONS } from "@/features/tour/lessonLock";
import { resolveTourLessonId } from "@/features/tour/tourLesson";
import {
  periodDividerLabel,
  periodOf,
  sortLessonsChronologically,
} from "./lessonCardModel";
import { travelGapKey, type TravelConflict } from "./travelGap";

const DRAG_THRESHOLD_PX = 8;
const NARROW_BREAKPOINT = 768;

interface Props {
  lessons: Lesson[];
  anchorDate: string;
  today: string;
  lookups: ReturnType<typeof useLookups>;
  conflictsByLesson: Map<string, Conflict[]>;
  travelConflicts?: TravelConflict[];
  focusedTravelKey?: string | null;
  travelFocusNonce?: number;
  onFocusTravelGap?: (key: string) => void;
  focusedOverlapKey?: string | null;
  overlapFocusNonce?: number;
  focusLessonId?: string | null;
  onConflictFocused?: (lessonId: string, el: HTMLElement | null) => void;
  selectedLessonId?: string | null;
  lockLessonSelection?: string | null;
  onSelectLesson?: (lesson: Lesson, el: HTMLElement) => void;
  onMoveLesson?: (id: string, date: string, startMin: number, endMin: number) => void;
}

function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return narrow;
}

interface DragState {
  lesson: Lesson;
  pointerId: number;
  startX: number;
  startY: number;
  activated: boolean;
}

interface DropTarget {
  date: string;
  insertIndex: number;
}

type DayRow =
  | { kind: "period"; label: "AFTERNOON" | "EVENING" }
  | { kind: "lesson"; lesson: Lesson; lessonIndex: number };

function buildDayRows(dayLessons: Lesson[]): DayRow[] {
  const sorted = sortLessonsChronologically(dayLessons);
  const rows: DayRow[] = [];
  let lastPeriod: ReturnType<typeof periodOf> | null = null;
  let lessonIndex = 0;

  for (const lesson of sorted) {
    const current = periodOf(lesson.startMin);
    const divider = periodDividerLabel(current);
    if (divider && current !== lastPeriod) {
      rows.push({ kind: "period", label: divider });
    }
    lastPeriod = current;
    rows.push({ kind: "lesson", lesson, lessonIndex });
    lessonIndex += 1;
  }

  return rows;
}

function findDropTarget(
  clientX: number,
  clientY: number,
  days: string[],
  dayColRefs: (HTMLDivElement | null)[],
  stackRefs: Map<string, HTMLDivElement | null>
): DropTarget | null {
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const col = dayColRefs[dayIndex];
    if (!col) continue;
    const rect = col.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right) continue;

    const date = days[dayIndex];
    const stack = stackRefs.get(date);
    if (!stack) return { date, insertIndex: 0 };

    const cards = Array.from(stack.querySelectorAll<HTMLElement>("[data-lesson-id]"));
    if (cards.length === 0) return { date, insertIndex: 0 };

    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect();
      const midY = cardRect.top + cardRect.height / 2;
      if (clientY < midY) return { date, insertIndex: i };
    }

    return { date, insertIndex: cards.length };
  }
  return null;
}

export function WeekTimeline({
  lessons,
  anchorDate,
  today,
  lookups,
  conflictsByLesson,
  travelConflicts = [],
  focusedTravelKey = null,
  travelFocusNonce = 0,
  focusedOverlapKey = null,
  overlapFocusNonce = 0,
  focusLessonId = null,
  onConflictFocused,
  selectedLessonId = null,
  lockLessonSelection = null,
  onSelectLesson,
  onMoveLesson,
}: Props) {
  const days = useMemo(() => weekDates(parseISO(anchorDate)), [anchorDate]);
  const now = useNowMinute();
  const isNarrow = useIsNarrow();
  const weekTodayKey = `${anchorDate}:${today}`;
  const [mobileDay, setMobileDay] = useState(() => {
    const idx = days.indexOf(today);
    return { key: weekTodayKey, index: idx >= 0 ? idx : 0 };
  });
  const todayIdx = days.indexOf(today);
  const mobileDayIndex =
    mobileDay.key === weekTodayKey
      ? mobileDay.index
      : todayIdx >= 0
        ? todayIdx
        : mobileDay.index;

  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayColRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stackRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const suppressClickRef = useRef(false);
  const onConflictFocusedRef = useRef(onConflictFocused);
  const lessonsRef = useRef(lessons);

  useEffect(() => {
    onConflictFocusedRef.current = onConflictFocused;
    lessonsRef.current = lessons;
  }, [onConflictFocused, lessons]);

  const tourLessonId = useMemo(
    () =>
      resolveTourLessonId(lessons, days, (id) => lookups.classGroupsById.get(id)?.code),
    [days, lessons, lookups]
  );

  const travelGapByLesson = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of travelConflicts) {
      const key = travelGapKey(c);
      map.set(c.lessonIds[0], key);
      map.set(c.lessonIds[1], key);
    }
    return map;
  }, [travelConflicts]);

  const byDay = useMemo(() => {
    const map = new Map<string, DayRow[]>();
    for (const date of days) {
      const dayLessons = lessons.filter((l) => l.date === date);
      map.set(date, buildDayRows(dayLessons));
    }
    return map;
  }, [lessons, days]);

  const lessonCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const [date, rows] of byDay) {
      map.set(date, rows.filter((r) => r.kind === "lesson").length);
    }
    return map;
  }, [byDay]);

  const nowMin = nowMinOn(today, now);

  useEffect(() => {
    if (!focusedTravelKey || travelFocusNonce === 0) return;
    const t = requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector(
        `[data-travel-gap="${CSS.escape(focusedTravelKey)}"]`
      );
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(t);
  }, [focusedTravelKey, travelFocusNonce]);

  useEffect(() => {
    if (!focusLessonId || overlapFocusNonce === 0) return;

    const focused = lessonsRef.current.find((l) => l.id === focusLessonId);
    const dayIdx = focused ? days.indexOf(focused.date) : -1;
    if (isNarrow && dayIdx >= 0 && dayIdx !== mobileDayIndex) {
      setMobileDay({ key: weekTodayKey, index: dayIdx });
      return;
    }

    const timer = window.setTimeout(() => {
      const el = scrollerRef.current?.querySelector(
        `[data-lesson-id="${CSS.escape(focusLessonId)}"]`
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      onConflictFocusedRef.current?.(focusLessonId, el);
    }, 50);
    return () => clearTimeout(timer);
  }, [focusLessonId, overlapFocusNonce, mobileDayIndex, isNarrow, days, weekTodayKey]);

  const focusedLessonIds = useMemo(() => {
    if (!focusedTravelKey) return null;
    const [a, b] = focusedTravelKey.split("|");
    return new Set([a, b]);
  }, [focusedTravelKey]);

  const focusedOverlapIds = useMemo(() => {
    if (!focusedOverlapKey) return null;
    const [a, b] = focusedOverlapKey.split("|");
    return new Set([a, b]);
  }, [focusedOverlapKey]);

  const visibleDays = isNarrow ? [days[mobileDayIndex] ?? days[0]] : days;

  const handleSelect = onSelectLesson
    ? (lesson: Lesson, el: HTMLElement) => {
        if (suppressClickRef.current) return;
        if (lockLessonSelection === TOUR_BLOCK_ALL_LESSONS) return;
        if (lockLessonSelection && lesson.id !== lockLessonSelection) return;
        onSelectLesson(lesson, el);
      }
    : undefined;

  useEffect(() => {
    if (!drag) return;

    const activeDrag = drag;

    const finishDrag = (target: DropTarget | null, ended: DragState | null) => {
      if (ended && target && onMoveLesson) {
        const { lesson } = ended;
        if (target.date !== lesson.date) {
          onMoveLesson(lesson.id, target.date, lesson.startMin, lesson.endMin);
          suppressClickRef.current = true;
          requestAnimationFrame(() => {
            suppressClickRef.current = false;
          });
        }
      }
      setDrag(null);
      setDropTarget(null);
      dropTargetRef.current = null;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activeDrag.pointerId) return;
      const dx = e.clientX - activeDrag.startX;
      const dy = e.clientY - activeDrag.startY;
      const dist = Math.hypot(dx, dy);

      if (!activeDrag.activated && dist >= DRAG_THRESHOLD_PX) {
        setDrag({ ...activeDrag, activated: true });
      }

      if (dist >= DRAG_THRESHOLD_PX || activeDrag.activated) {
        const target = findDropTarget(
          e.clientX,
          e.clientY,
          days,
          dayColRefs.current,
          stackRefs.current
        );
        dropTargetRef.current = target;
        setDropTarget(target);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activeDrag.pointerId) return;
      const current = activeDrag.activated ? activeDrag : null;
      finishDrag(dropTargetRef.current, current);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, days, onMoveLesson]);

  const renderDayColumn = (date: string, dayIndex: number) => {
    const rows = byDay.get(date) ?? [];
    const lessonCount = lessonCountByDay.get(date) ?? 0;
    const isToday = date === today;
    const isDropColumn = dropTarget?.date === date;

    return (
      <div
        key={date}
        ref={(el) => {
          dayColRefs.current[dayIndex] = el;
        }}
        className={`week-agenda__day ${isToday ? "week-agenda__day--today" : ""}`}
      >
        <div
          ref={(el) => {
            stackRefs.current.set(date, el);
          }}
          className="week-agenda__stack"
        >
          {lessonCount === 0 && (
            <div className="week-agenda__empty" aria-hidden={!!drag}>
              No lessons
            </div>
          )}

          {rows.map((row) => {
            if (row.kind === "period") {
              return (
                <div key={`${date}-${row.label}`} className="week-agenda__period" aria-hidden>
                  <span className="week-agenda__period-label">{row.label}</span>
                </div>
              );
            }

            const { lesson, lessonIndex } = row;
            const conflicts = conflictsByLesson.get(lesson.id) ?? [];
            const gapKey = travelGapByLesson.get(lesson.id);
            const showInsertBefore =
              isDropColumn && dropTarget?.insertIndex === lessonIndex && drag?.activated;

            return (
              <div key={lesson.id}>
                {showInsertBefore && <div className="week-agenda__insert" aria-hidden />}
                <LessonBlock
                  lesson={lesson}
                  conflicts={conflicts}
                  lookups={lookups}
                  today={today}
                  nowMin={nowMin}
                  isSelected={selectedLessonId === lesson.id}
                  travelHighlighted={focusedLessonIds?.has(lesson.id) ?? false}
                  travelGapKey={gapKey}
                  conflictHighlighted={focusedOverlapIds?.has(lesson.id) ?? false}
                  conflictFocusNonce={focusLessonId === lesson.id ? overlapFocusNonce : 0}
                  tourTarget={lesson.id === tourLessonId}
                  isDragging={drag?.activated && drag.lesson.id === lesson.id}
                  onSelect={handleSelect}
                  onDragStart={
                    onMoveLesson
                      ? (l, e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDrag({
                            lesson: l,
                            pointerId: e.pointerId,
                            startX: e.clientX,
                            startY: e.clientY,
                            activated: false,
                          });
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}

          {isDropColumn &&
            dropTarget &&
            dropTarget.insertIndex >= lessonCount &&
            drag?.activated && <div className="week-agenda__insert" aria-hidden />}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={scrollerRef}
      className="week-agenda flex-1 overflow-auto"
      role="region"
      aria-label="Week schedule"
      data-overlap-focus={focusedOverlapKey ?? undefined}
    >
      <div className="week-agenda__board">
        {isNarrow ? (
          <div className="week-agenda__mobile-nav" role="tablist" aria-label="Day">
            {days.map((date, i) => {
              const d = parseISO(date);
              const isToday = date === today;
              const isActive = i === mobileDayIndex;
              const count = lessonCountByDay.get(date) ?? 0;
              return (
                <button
                  key={date}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`week-agenda__day-tab ${isActive ? "week-agenda__day-tab--active" : ""} ${isToday ? "week-agenda__day-tab--today" : ""}`}
                  onClick={() => setMobileDay({ key: weekTodayKey, index: i })}
                >
                  <span className="cf-mono text-[11px] font-semibold uppercase">
                    {format(d, "EEE")}
                  </span>
                  <span className="cf-mono text-[10px]">{format(d, "dd/MM")}</span>
                  {count > 0 && <span className="week-agenda__day-count">{count}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="week-agenda__header">
            {days.map((date) => {
              const isToday = date === today;
              const d = parseISO(date);
              const count = lessonCountByDay.get(date) ?? 0;
              return (
                <div
                  key={date}
                  className={`week-agenda__header-cell ${isToday ? "week-agenda__header-cell--today" : ""}`}
                >
                  <span
                    className={`cf-mono text-[11px] font-semibold uppercase ${isToday ? "text-accent" : "text-ink-mute"}`}
                  >
                    {format(d, "EEE")}
                  </span>
                  <span
                    className={`cf-mono ml-1.5 text-[11px] ${isToday ? "text-accent" : "text-ink-faint"}`}
                  >
                    {format(d, "dd/MM")}
                  </span>
                  {count > 0 && (
                    <span className="cf-mono ml-1 text-[10px] text-ink-faint">{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`week-agenda__columns ${isNarrow ? "week-agenda__columns--single" : ""}`}
        >
          {visibleDays.map((date) => renderDayColumn(date, days.indexOf(date)))}
        </div>
      </div>
    </div>
  );
}
