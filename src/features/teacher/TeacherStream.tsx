"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Lesson, Teacher } from "@/domain/types";
import { lessonHours } from "@/domain/types";
import { useFxRate, useLessons, useLookups } from "@/data/hooks";
import { formatMin, formatRange, nowMinOn, weekDates } from "@/domain/time";
import { usdToVnd, formatUsd, formatVnd } from "@/domain/money";
import { SchoolChip, schoolClass } from "@/components/SchoolChip";

/**
 * One merged schedule across every school, in a single stream. Past
 * delivered lessons are settled and solid — money already earned — while
 * struck/dimmed is reserved for cancelled and no-show only.
 */
export function TeacherStream({ teacher, today }: { teacher: Teacher; today: string }) {
  const lessons = useLessons();
  const lookups = useLookups();
  const fxRate = useFxRate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = useMemo(() => weekDates(parseISO(today)), [today]);
  const mine = useMemo(
    () =>
      lessons
        .filter((l) => l.teacherId === teacher.id)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin),
    [lessons, teacher.id]
  );

  return (
    <div className="flex flex-col gap-4">
      {days.map((date) => {
        const dayLessons = mine.filter((l) => l.date === date);
        if (dayLessons.length === 0) return null;
        const isToday = date === today;
        const nowMin = nowMinOn(date, now);

        return (
          <section key={date} aria-label={format(parseISO(date), "EEEE d MMMM")}>
            <h2 className="mb-1.5 flex items-baseline gap-2 px-1">
              <span
                className={`cf-mono text-[12px] font-bold uppercase tracking-wide ${isToday ? "text-accent" : "text-ink-mute"}`}
              >
                {format(parseISO(date), "EEE dd/MM")}
              </span>
              {isToday && (
                <span className="cf-mono rounded-sm bg-accent px-1.5 text-[10px] font-bold uppercase text-accent-ink">
                  today
                </span>
              )}
            </h2>
            <ol className="flex flex-col gap-1.5">
              {dayLessons.map((lesson) => {
                const showNowBefore =
                  nowMin !== null && nowMin < lesson.startMin &&
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
                      isNow={nowMin !== null && nowMin >= lesson.startMin && nowMin < lesson.endMin}
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
      <span className="cf-mono rounded-sm bg-accent px-1.5 text-[10px] font-bold text-accent-ink">
        {formatMin(min)}
      </span>
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
      className={`${schoolClass(school)} rounded-lg border p-3 ${
        isOff
          ? "border-line bg-surface"
          : isNow
            ? "border-accent bg-raised"
            : "border-line-soft bg-raised"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`cf-mono text-[13px] font-semibold ${isOff ? "text-ink-faint line-through decoration-danger/60" : ""}`}
        >
          {formatRange(lesson.startMin, lesson.endMin)}
        </span>
        <span className="cf-mono text-[11px] text-ink-mute">{durationMin}min</span>
        <span className="ml-auto flex items-center gap-1.5">
          {isNow && !isOff && (
            <span className="cf-mono rounded-sm bg-accent px-1.5 text-[10px] font-bold uppercase text-accent-ink">
              now
            </span>
          )}
          {/* Delivered = money earned: settled and solid, never dimmed. */}
          {isPast && !isOff && (
            <span
              className="cf-mono rounded-sm px-1.5 text-[10px] font-bold uppercase"
              style={{ background: "var(--accent-soft)", color: "var(--ok)" }}
            >
              delivered
            </span>
          )}
          {isOff && (
            <span
              className="cf-mono rounded-sm px-1.5 text-[10px] font-bold uppercase"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {lesson.status === "cancelled" ? "cancelled" : "no-show"}
            </span>
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

      <div className="mt-2 flex items-baseline justify-between border-t border-line-soft pt-1.5">
        <span className={`text-[12px] ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
          Room <span className="cf-mono font-medium text-ink">{room?.name}</span> · {campus?.name}
          {lesson.cmName && <span> · with {lesson.cmName}</span>}
        </span>
        <span className="cf-mono text-[11px]">
          {isOff ? (
            <span className="text-ink-faint">
              <s>{formatUsd(usd)}</s> not paid
            </span>
          ) : (
            <span className="text-ink-mute">
              {formatUsd(usd)} · {formatVnd(usdToVnd(usd, fxRate))}
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
