"use client";

import { format, parseISO } from "date-fns";
import type { Lesson, Teacher } from "@/domain/types";
import { lessonHours } from "@/domain/types";
import type { useFxRate, useLookups } from "@/data/hooks";
import { formatDuration, formatMin, formatRange } from "@/domain/time";
import { formatUsd, formatVnd, usdToVnd } from "@/domain/money";
import { schoolClass } from "@/components/Badge";
import {
  formatClassIdentity,
  formatCoTeacher,
  formatCurriculum,
  formatLocation,
  formatWeekCode,
} from "./lessonPresentation";

const DAY_HEADING = "EEE d MMM";

function statusWord({
  isOff,
  isNow,
  isNext,
  isPast,
  status,
}: {
  isOff: boolean;
  isNow: boolean;
  isNext: boolean;
  isPast: boolean;
  status: Lesson["status"];
}): { label: string; tone: "now" | "delivered" | "cancelled" | "scheduled" } {
  if (isOff) {
    return {
      label: status === "cancelled" ? "cancelled" : "no-show",
      tone: "cancelled",
    };
  }
  if (isNow) return { label: "now", tone: "now" };
  if (isNext) return { label: "next", tone: "now" };
  if (isPast) return { label: "delivered", tone: "delivered" };
  return { label: "scheduled", tone: "scheduled" };
}

/**
 * One lesson as three labelled zones: when, what, and pay. Codes and campus
 * names are never shown raw — each value carries a word that says what it is.
 */
export function LessonRow({
  lesson,
  lookups,
  teacher,
  fxRate,
  isPast,
  isNow,
  isNext,
}: {
  lesson: Lesson;
  lookups: ReturnType<typeof useLookups>;
  teacher: Teacher;
  fxRate: ReturnType<typeof useFxRate>;
  isPast: boolean;
  isNow: boolean;
  isNext: boolean;
}) {
  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const school = lookups.schoolOfRoom(lesson.roomId);

  const isOff = lesson.status !== "scheduled";
  const usd = lessonHours(lesson) * teacher.usdRate;
  const durationMin = lesson.endMin - lesson.startMin;
  const identity = formatClassIdentity(group);
  const curriculum = formatCurriculum(lesson.curriculum);
  const location = formatLocation({
    schoolName: school?.name,
    campusName: campus?.name,
    roomName: room?.name,
  });
  const week = formatWeekCode(lesson.weekCode);
  const coTeacher = formatCoTeacher(lesson.cmName);
  const status = statusWord({
    isOff,
    isNow,
    isNext,
    isPast,
    status: lesson.status,
  });
  const identityLine = [identity.classLabel, identity.level].filter(Boolean).join(" · ");
  const syllabusLine = [week, coTeacher].filter(Boolean).join(" · ");

  return (
    <li
      className={`teacher-row ${schoolClass(school)}`}
      data-cancelled={isOff || undefined}
      data-now={(isNow && !isOff) || undefined}
    >
      <p className="teacher-row__time">
        <span className="teacher-row__start cf-mono">
          {formatRange(lesson.startMin, lesson.endMin)}
        </span>
        <span className="teacher-row__duration cf-mono">{formatDuration(durationMin)}</span>
      </p>

      <div className="teacher-row__body">
        {identity.program && <p className="teacher-row__title">{identity.program}</p>}
        {identityLine && <p className="teacher-row__class">{identityLine}</p>}
        {curriculum && <p className="teacher-row__detail">{curriculum}</p>}
        {location && <p className="teacher-row__where">{location}</p>}
        {syllabusLine && <p className="teacher-row__aux">{syllabusLine}</p>}
        {lesson.movedFrom && !isOff && (
          <p className="teacher-row__moved">
            Moved from {format(parseISO(lesson.movedFrom.date), DAY_HEADING)} at{" "}
            {formatMin(lesson.movedFrom.startMin)}
          </p>
        )}
      </div>

      <div className="teacher-row__aside">
        <span className={`teacher-row__status teacher-row__status--${status.tone}`}>
          {status.label}
        </span>
        <span className="teacher-row__pay cf-mono">
          <span className="teacher-row__usd">{formatUsd(usd)}</span>
          {isOff ? (
            <span className="teacher-row__unpaid">not paid</span>
          ) : (
            <span className="teacher-row__vnd">{formatVnd(usdToVnd(usd, fxRate))}</span>
          )}
        </span>
      </div>
    </li>
  );
}
