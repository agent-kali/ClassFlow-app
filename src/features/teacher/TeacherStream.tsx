"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson, Teacher } from "@/domain/types";
import { isPayable, lessonHours } from "@/domain/types";
import { lessonHasEnded, type Instant } from "@/domain/earnings";
import { useFxRate, useLessons, useLookups } from "@/data/hooks";
import { formatDuration, formatMin, formatRange } from "@/domain/time";
import { usdToVnd, formatUsd, formatVnd } from "@/domain/money";
import { Badge, schoolClass } from "@/components/Badge";
import { SchoolChip } from "@/components/SchoolChip";
import type { PeriodRange } from "./PeriodSwitcher";
import { countTeacherStream, formatTeacherStreamSubline } from "./streamSummary";

const DAY_HEADING = "EEE d MMM";

/**
 * One merged schedule across every school, in a single stream. Next lesson
 * leads. Finished payable lessons are settled — money already earned — while
 * struck/dimmed is reserved for cancelled and no-show only.
 */
export function TeacherStream({
  teacher,
  today,
  range,
  scopeLabel,
}: {
  teacher: Teacher;
  today: string;
  range: PeriodRange;
  scopeLabel: string;
}) {
  const lessons = useLessons();
  const lookups = useLookups();
  const fxRate = useFxRate();
  const [now, setNow] = useState(() => new Date());
  const todaySectionRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const asOf: Instant = useMemo(
    () => ({ date: today, min: now.getHours() * 60 + now.getMinutes() }),
    [today, now]
  );

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

  const dayKeys = useMemo(() => {
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const l of mine) {
      if (!seen.has(l.date)) {
        seen.add(l.date);
        keys.push(l.date);
      }
    }
    return keys;
  }, [mine]);

  const counts = countTeacherStream(mine, asOf);
  const allDelivered = counts.allDelivered;

  const happeningNow = mine.find(
    (l) =>
      isPayable(l) &&
      l.date === asOf.date &&
      asOf.min >= l.startMin &&
      asOf.min < l.endMin
  );
  const nextUp = mine.find(
    (l) =>
      isPayable(l) &&
      (l.date > asOf.date || (l.date === asOf.date && l.startMin > asOf.min))
  );
  const heroLesson = happeningNow ?? nextUp;

  useEffect(() => {
    const section = todaySectionRef.current;
    if (!section) return;
    const heroH = heroRef.current?.getBoundingClientRect().height ?? 0;
    const stickyTop = window.matchMedia("(min-width: 1280px)").matches ? 16 : 0;
    section.style.scrollMarginTop = `${stickyTop + heroH + 8}px`;
    section.scrollIntoView({ block: "start" });
  }, [today, range.from, range.to, teacher.id, heroLesson?.id]);

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h2 className="text-[15px] font-semibold leading-tight">
          {allDelivered ? `Delivered — ${scopeLabel}` : scopeLabel}
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          {formatTeacherStreamSubline(counts, dayKeys.length)}
        </p>
      </header>

      {heroLesson && (
        <div ref={heroRef} className="sticky top-0 z-10 bg-ground pb-2 xl:top-4">
          <NextLessonHero
            lesson={heroLesson}
            today={today}
            lookups={lookups}
            teacher={teacher}
            fxRate={fxRate}
            happeningNow={heroLesson === happeningNow}
            waitLabel={
              heroLesson === happeningNow ? null : waitLabel(asOf, heroLesson)
            }
          />
        </div>
      )}

      {dayKeys.map((date) => {
        const dayLessons = mine.filter((l) => l.date === date);
        const isToday = date === today;

        return (
          <section
            key={date}
            ref={isToday ? todaySectionRef : undefined}
            id={isToday ? `teacher-day-${date}` : undefined}
            aria-label={format(parseISO(date), "EEEE d MMMM")}
          >
            <h3 className="mb-1.5 flex items-baseline gap-2 px-1">
              <span
                className={`cf-mono text-[12px] font-bold uppercase tracking-wide ${isToday ? "text-accent" : "text-ink-mute"}`}
              >
                {format(parseISO(date), DAY_HEADING)}
              </span>
              {isToday && (
                <Badge size="sm" tone="planned">
                  today
                </Badge>
              )}
            </h3>
            <ol className="flex flex-col gap-1.5">
              {dayLessons.map((lesson) => {
                const isNow =
                  lesson.date === asOf.date &&
                  asOf.min >= lesson.startMin &&
                  asOf.min < lesson.endMin;
                return (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    lookups={lookups}
                    teacher={teacher}
                    fxRate={fxRate}
                    isPast={lessonHasEnded(lesson, asOf)}
                    isNow={isNow}
                  />
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function waitLabel(asOf: Instant, lesson: Pick<Lesson, "date" | "startMin">): string {
  const from = parseISO(asOf.date).getTime();
  const to = parseISO(lesson.date).getTime();
  const dayDiff = Math.round((to - from) / 86_400_000);
  const minutes = dayDiff * 24 * 60 + (lesson.startMin - asOf.min);
  return `in ${formatDuration(Math.max(0, minutes))}`;
}

function NextLessonHero({
  lesson,
  today,
  lookups,
  teacher,
  fxRate,
  happeningNow,
  waitLabel: wait,
}: {
  lesson: Lesson;
  today: string;
  lookups: ReturnType<typeof useLookups>;
  teacher: Teacher;
  fxRate: ReturnType<typeof useFxRate>;
  happeningNow: boolean;
  waitLabel: string | null;
}) {
  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const school = lookups.schoolOfRoom(lesson.roomId);
  const usd = lessonHours(lesson) * teacher.usdRate;
  const durationMin = lesson.endMin - lesson.startMin;
  const showDate = lesson.date !== today;

  return (
    <article
      className={`${schoolClass(school)} cf-card rounded-lg p-3 ring-1 ring-accent/25`}
      aria-label={happeningNow ? "Happening now" : "Next lesson"}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
        {happeningNow ? "Happening now" : "Next up"}
        {wait && <span className="ml-1.5 font-medium normal-case tracking-normal text-ink-mute">{wait}</span>}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="cf-card__time cf-mono text-[13px] font-semibold">
          {showDate && (
            <span className="font-medium text-ink-mute">
              {format(parseISO(lesson.date), DAY_HEADING)} ·{" "}
            </span>
          )}
          {formatRange(lesson.startMin, lesson.endMin)}
          <span className="ml-1.5 font-medium text-ink-mute">· {formatDuration(durationMin)}</span>
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[15px] font-semibold">{group?.program}</span>
        <span className="cf-mono text-[12px] text-ink-mute">{group?.code}</span>
      </div>
      <p className="mt-0.5 text-[12px] text-ink-mute">
        {lesson.curriculum}
        {lesson.weekCode && (
          <span className="cf-mono ml-1.5 text-[11px]">{lesson.weekCode}</span>
        )}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[12px] text-ink-mute">
          {room?.name} · {campus?.name}
        </span>
        <span className="cf-mono text-right text-[12px] font-semibold tabular-nums text-ink">
          {formatUsd(usd)}
          <span className="mt-0.5 block text-[10px] font-medium text-ink-mute">
            {formatVnd(usdToVnd(usd, fxRate))}
          </span>
        </span>
      </div>
    </article>
  );
}

function LessonCard({
  lesson,
  lookups,
  teacher,
  fxRate,
  isPast,
  isNow,
}: {
  lesson: Lesson;
  lookups: ReturnType<typeof useLookups>;
  teacher: Teacher;
  fxRate: ReturnType<typeof useFxRate>;
  isPast: boolean;
  isNow: boolean;
}) {
  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const school = lookups.schoolOfRoom(lesson.roomId);

  const isOff = lesson.status !== "scheduled";
  const usd = lessonHours(lesson) * teacher.usdRate;
  const durationMin = lesson.endMin - lesson.startMin;

  return (
    <li
      data-cancelled={isOff || undefined}
      data-now={isNow || undefined}
      className={`${schoolClass(school)} cf-card rounded-lg p-3`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`cf-card__time cf-mono text-[13px] font-semibold ${isOff ? "text-ink-faint" : ""}`}
        >
          {formatRange(lesson.startMin, lesson.endMin)}
          <span className={`ml-1.5 font-medium ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
            · {formatDuration(durationMin)}
          </span>
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {isNow && !isOff && (
            <Badge size="sm" tone="planned">
              now
            </Badge>
          )}
          {isPast && !isOff && (
            <Badge size="sm" tone="delivered">
              delivered
            </Badge>
          )}
          {isOff && (
            <Badge size="sm" tone="cancelled">
              {lesson.status === "cancelled" ? "cancelled" : "no-show"}
            </Badge>
          )}
        </span>
      </div>

      <div className={`mt-1.5 flex items-baseline gap-2 ${isOff ? "text-ink-faint" : ""}`}>
        <span className="text-[15px] font-semibold">{group?.program}</span>
        <span className="cf-mono text-[12px] text-ink-mute">{group?.code}</span>
      </div>

      <p className={`mt-0.5 text-[12px] ${isOff ? "text-ink-faint line-through decoration-danger/40" : "text-ink-mute"}`}>
        {lesson.curriculum}
        {lesson.weekCode && <span className="cf-mono ml-1.5 text-[11px] no-underline">{lesson.weekCode}</span>}
      </p>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_7.5rem] items-baseline gap-3 border-t border-line-soft pt-1.5">
        <span className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
          <span>
            Room{" "}
            <Badge size="xs" tone="room" className={isOff ? "bg-transparent! text-ink-faint" : ""}>
              {room?.name}
            </Badge>
          </span>
          <span>· {campus?.name}</span>
          {lesson.cmName && <span>· CM {lesson.cmName}</span>}
          <SchoolChip school={school} />
        </span>
        <span className="cf-mono text-right text-[12px] font-semibold tabular-nums">
          {isOff ? (
            <span className="font-medium text-ink-faint">
              <s>{formatUsd(usd)}</s>{" "}
              <span className="font-normal">not paid</span>
            </span>
          ) : (
            <span className="text-ink">
              {formatUsd(usd)}
              <span className="mt-0.5 block text-[10px] font-medium text-ink-mute">
                {formatVnd(usdToVnd(usd, fxRate))}
              </span>
            </span>
          )}
        </span>
      </div>

      {lesson.movedFrom && !isOff && (
        <p className="mt-1.5 text-[11px] text-ink-mute">
          Moved from {format(parseISO(lesson.movedFrom.date), DAY_HEADING)} at{" "}
          {formatMin(lesson.movedFrom.startMin)}.
        </p>
      )}
    </li>
  );
}
