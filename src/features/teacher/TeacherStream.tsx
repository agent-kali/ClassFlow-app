"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson, Teacher } from "@/domain/types";
import { lessonHours } from "@/domain/types";
import { useFxRate, useLessons, useLookups } from "@/data/hooks";
import { formatMin, formatRange, nowMinOn } from "@/domain/time";
import { usdToVnd, formatUsd, formatVnd } from "@/domain/money";
import { Badge, schoolClass } from "@/components/Badge";
import { SchoolChip } from "@/components/SchoolChip";
import type { PeriodRange } from "./PeriodSwitcher";

/**
 * One merged schedule across every school, in a single stream. Past
 * delivered lessons are settled and solid — money already earned — while
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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h2 className="text-[15px] font-semibold leading-tight">
          Delivered lessons — {scopeLabel}
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          {mine.length === 0
            ? "No lessons in this period."
            : `${mine.length} lesson${mine.length === 1 ? "" : "s"} across ${dayKeys.length} day${dayKeys.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {dayKeys.map((date) => {
        const dayLessons = mine.filter((l) => l.date === date);
        const isToday = date === today;
        const nowMin = nowMinOn(date, now);

        return (
          <section key={date} aria-label={format(parseISO(date), "EEEE d MMMM")}>
            <h3 className="mb-1.5 flex items-baseline gap-2 px-1">
              <span
                className={`cf-mono text-[12px] font-bold uppercase tracking-wide ${isToday ? "text-accent" : "text-ink-mute"}`}
              >
                {format(parseISO(date), "EEE dd/MM")}
              </span>
              {isToday && (
                <Badge size="sm" tone="planned">
                  today
                </Badge>
              )}
            </h3>
            <ol className="flex flex-col gap-1.5">
              {dayLessons.map((lesson) => {
                const showNowBefore =
                  nowMin !== null &&
                  nowMin < lesson.startMin &&
                  dayLessons.every(
                    (o) => o.startMin >= lesson.startMin || o.endMin <= nowMin
                  );
                return (
                  <Fragment key={lesson.id}>
                    {showNowBefore && <NowRule min={nowMin} />}
                    <LessonCard
                      lesson={lesson}
                      lookups={lookups}
                      teacher={teacher}
                      fxRate={fxRate}
                      isPast={
                        nowMin !== null ? lesson.endMin <= nowMin : date < today
                      }
                      isNow={
                        nowMin !== null &&
                        nowMin >= lesson.startMin &&
                        nowMin < lesson.endMin
                      }
                    />
                  </Fragment>
                );
              })}
              {nowMin !== null && dayLessons.every((l) => l.endMin <= nowMin) && (
                <NowRule min={nowMin} label="done for today" />
              )}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function NowRule({ min, label }: { min: number; label?: string }) {
  return (
    <li aria-hidden className="flex items-center gap-2 px-1">
      <Badge size="sm" tone="planned">
        {formatMin(min)}
      </Badge>
      <span className="h-px flex-1 bg-accent" />
      {label && <span className="text-[10px] text-accent">{label}</span>}
    </li>
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
        </span>
        <span className="cf-mono text-[11px] text-ink-mute">{durationMin}min</span>
        <span className="ml-auto flex items-center gap-1.5">
          {isNow && !isOff && (
            <Badge size="sm" tone="planned">
              now
            </Badge>
          )}
          {/* Delivered = money earned: settled and solid, never dimmed. */}
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
          <SchoolChip school={school} />
        </span>
      </div>

      <div className={`mt-1.5 flex items-baseline gap-2 ${isOff ? "text-ink-faint" : ""}`}>
        <span className="cf-mono text-[15px] font-bold" style={isOff ? undefined : { color: "var(--school)" }}>
          {group?.code}
        </span>
        <span className={`text-[12px] ${isOff ? "" : "text-ink-mute"}`}>
          {group?.program}
        </span>
      </div>

      <p className={`mt-0.5 text-[13px] ${isOff ? "text-ink-faint line-through decoration-danger/40" : ""}`}>
        {lesson.curriculum}
        {lesson.weekCode && <span className="cf-mono ml-1.5 text-[11px] text-ink-mute no-underline">{lesson.weekCode}</span>}
      </p>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_7.5rem] items-baseline gap-3 border-t border-line-soft pt-1.5">
        <span className={`min-w-0 text-[12px] ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
          Room{" "}
          <Badge size="xs" tone="room" className={isOff ? "bg-transparent! text-ink-faint" : ""}>
            {room?.name}
          </Badge>{" "}
          · {campus?.name}
          {lesson.cmName && <span> · with {lesson.cmName}</span>}
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
          Moved from {format(parseISO(lesson.movedFrom.date), "EEE dd/MM")} at{" "}
          {formatMin(lesson.movedFrom.startMin)}.
        </p>
      )}
    </li>
  );
}
