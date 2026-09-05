"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson, Teacher } from "@/domain/types";
import { isPayable, lessonHours } from "@/domain/types";
import { lessonHasEnded, type Instant } from "@/domain/earnings";
import { useFxRate, useLessons, useLookups } from "@/data/hooks";
import { formatDuration, weekDates } from "@/domain/time";
import { Badge } from "@/components/Badge";
import { LessonRow } from "./LessonRow";
import { formatRangeLabel, type PeriodMode, type PeriodRange } from "./period";
import { countTeacherStream, formatTeacherStreamSubline } from "./streamSummary";

const DAY_HEADING = "EEE d MMM";

type DayEntry = [date: string, lessons: Lesson[]];

interface WeekGroup {
  start: string;
  end: string;
  days: DayEntry[];
}

/**
 * One merged schedule across every school. Week is a flat day list focused on
 * today; month is the same rows grouped into collapsible weeks so a long scope
 * never becomes an endless stream. Finished payable lessons are settled —
 * struck and dimmed is reserved for cancelled and no-show only.
 */
export function TeacherStream({
  teacher,
  today,
  mode,
  anchor,
  range,
  scopeLabel,
  asOf,
  nextLessonId,
}: {
  teacher: Teacher;
  today: string;
  mode: PeriodMode;
  anchor: string;
  range: PeriodRange;
  scopeLabel: string;
  asOf: Instant;
  /** Marks the teacher's real next lesson when it happens to be in range. */
  nextLessonId: string | null;
}) {
  const lessons = useLessons();
  const lookups = useLookups();
  const fxRate = useFxRate();
  const todaySectionRef = useRef<HTMLElement | null>(null);

  const mine = useMemo(
    () =>
      lessons
        .filter(
          (l) =>
            l.teacherId === teacher.id &&
            l.date >= range.from &&
            l.date <= range.to
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin),
    [lessons, teacher.id, range.from, range.to]
  );

  const todayInRange = today >= range.from && today <= range.to;

  const days = useMemo<DayEntry[]>(() => {
    const byDate = new Map<string, Lesson[]>();
    for (const lesson of mine) {
      const day = byDate.get(lesson.date);
      if (day) day.push(lesson);
      else byDate.set(lesson.date, [lesson]);
    }
    // Week always keeps today on screen, even when nothing is scheduled.
    if (mode === "week" && todayInRange && !byDate.has(today)) byDate.set(today, []);
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [mine, mode, today, todayInRange]);

  const weeks = useMemo<WeekGroup[]>(() => {
    const groups = new Map<string, WeekGroup>();
    for (const entry of days) {
      const week = weekDates(parseISO(entry[0]));
      const group = groups.get(week[0]);
      if (group) group.days.push(entry);
      else groups.set(week[0], { start: week[0], end: week[6], days: [entry] });
    }
    return [...groups.values()].sort((a, b) => a.start.localeCompare(b.start));
  }, [days]);

  const focusWeek = useMemo(
    () => weekDates(parseISO(todayInRange ? today : anchor))[0],
    [todayInRange, today, anchor]
  );

  // Manual expansions belong to one scope; changing scope drops them without
  // an effect round-trip.
  const scope = `${teacher.id}|${range.from}|${range.to}`;
  const [expansions, setExpansions] = useState<{
    scope: string;
    open: Record<string, boolean>;
  }>({ scope, open: {} });
  const openWeeks = expansions.scope === scope ? expansions.open : {};

  useEffect(() => {
    // `nearest` keeps today in view without yanking the banner or earnings
    // off screen when the list already fits.
    todaySectionRef.current?.scrollIntoView({ block: "nearest" });
  }, [range.from, range.to, teacher.id]);

  const counts = countTeacherStream(mine, asOf);

  const renderDay = ([date, dayLessons]: DayEntry) => {
    const isToday = date === today;
    return (
      <section
        key={date}
        ref={isToday ? todaySectionRef : undefined}
        id={isToday ? `teacher-day-${date}` : undefined}
        className="teacher-day"
        aria-label={format(parseISO(date), "EEEE d MMMM")}
      >
        <h3 className="teacher-day__heading">
          <span
            className={`cf-mono text-[14px] font-bold uppercase tracking-wide ${
              isToday ? "text-accent" : "text-ink-mute"
            }`}
          >
            {format(parseISO(date), DAY_HEADING)}
          </span>
          {isToday && (
            <Badge size="md" tone="planned">
              today
            </Badge>
          )}
        </h3>
        {dayLessons.length === 0 ? (
          <p className="teacher-day__empty">No lessons today.</p>
        ) : (
          <ol className="teacher-day__list">
            {dayLessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                lookups={lookups}
                teacher={teacher}
                fxRate={fxRate}
                isPast={lessonHasEnded(lesson, asOf)}
                isNow={
                  lesson.date === asOf.date &&
                  asOf.min >= lesson.startMin &&
                  asOf.min < lesson.endMin
                }
                isNext={lesson.id === nextLessonId}
              />
            ))}
          </ol>
        )}
      </section>
    );
  };

  return (
    <div className="teacher-stream">
      <header className="teacher-stream__header">
        <h2 className="text-[15px] font-semibold leading-tight">
          {counts.allDelivered ? `Delivered — ${scopeLabel}` : scopeLabel}
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-mute">
          {formatTeacherStreamSubline(counts, days.filter(([, l]) => l.length > 0).length)}
        </p>
      </header>

      {mode === "week"
        ? days.map(renderDay)
        : weeks.map((week) => {
            const open = openWeeks[week.start] ?? week.start === focusWeek;
            const weekLessons = week.days.flatMap(([, l]) => l);
            const payable = weekLessons.filter(isPayable);
            const minutes = payable.reduce((sum, l) => sum + lessonHours(l) * 60, 0);
            const panelId = `teacher-week-${week.start}`;
            return (
              <section key={week.start} className="teacher-week">
                <h3>
                  <button
                    type="button"
                    className="teacher-week__toggle"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() =>
                      setExpansions({
                        scope,
                        open: { ...openWeeks, [week.start]: !open },
                      })
                    }
                  >
                    <span className="teacher-week__chevron" aria-hidden="true">
                      {open ? "▾" : "▸"}
                    </span>
                    <span className="teacher-week__label cf-mono">
                      {formatRangeLabel(week.start, week.end)}
                    </span>
                    <span className="teacher-week__meta cf-mono">
                      {weekLessons.length} lessons · {formatDuration(minutes)}
                    </span>
                  </button>
                </h3>
                <div id={panelId} hidden={!open} className="teacher-week__panel">
                  {week.days.map(renderDay)}
                </div>
              </section>
            );
          })}
    </div>
  );
}
