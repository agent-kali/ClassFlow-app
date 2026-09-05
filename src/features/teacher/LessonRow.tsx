"use client";

import { format, parseISO } from "date-fns";
import type { Lesson, Teacher } from "@/domain/types";
import { lessonHours } from "@/domain/types";
import type { useFxRate, useLookups } from "@/data/hooks";
import { formatDuration, formatMin, formatRange } from "@/domain/time";
import { formatUsd, formatVnd, usdToVnd } from "@/domain/money";
import { Badge, schoolClass } from "@/components/Badge";
import { SchoolChip } from "@/components/SchoolChip";

const DAY_HEADING = "EEE d MMM";

/**
 * One lesson as a compact row, not a card. Metadata is layered by priority so
 * narrow widths wrap instead of shrinking: time / class / status / pay stay
 * primary, curriculum and location follow, codes and moves come last.
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
        <p className="teacher-row__title">
          {group?.program}
          <span className="teacher-row__class cf-mono">{group?.code}</span>
        </p>
        <p className="teacher-row__detail">{lesson.curriculum}</p>
        <p className="teacher-row__where">
          Room {room?.name} · {campus?.name}
          <SchoolChip school={school} />
        </p>
        <p className="teacher-row__aux">
          {lesson.weekCode && <span className="cf-mono">{lesson.weekCode}</span>}
          {lesson.cmName && <span>CM {lesson.cmName}</span>}
          {lesson.movedFrom && !isOff && (
            <span>
              Moved from {format(parseISO(lesson.movedFrom.date), DAY_HEADING)} at{" "}
              {formatMin(lesson.movedFrom.startMin)}
            </span>
          )}
        </p>
      </div>

      <div className="teacher-row__aside">
        <span className="teacher-row__status">
          {isNow && !isOff && (
            <Badge size="md" tone="planned">
              now
            </Badge>
          )}
          {isNext && !isNow && !isOff && (
            <Badge size="md" tone="planned">
              next
            </Badge>
          )}
          {isPast && !isOff && !isNow && (
            <Badge size="md" tone="delivered">
              delivered
            </Badge>
          )}
          {isOff && (
            <Badge size="md" tone="cancelled">
              {lesson.status === "cancelled" ? "cancelled" : "no-show"}
            </Badge>
          )}
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
