"use client";

import { format, parseISO } from "date-fns";
import type { Lesson } from "@/domain/types";
import type { useLookups } from "@/data/hooks";
import type { Instant } from "@/domain/earnings";
import { formatDuration, formatRange } from "@/domain/time";
import { minutesUntil } from "./streamSummary";
import { formatBannerLine } from "./lessonPresentation";

const DAY_HEADING = "EEE d MMM";

/**
 * The operational line: what the teacher has to walk into next. Driven by the
 * teacher's whole schedule against `asOf`, never by the browsed period.
 */
export function NextLessonBanner({
  lesson,
  happeningNow,
  today,
  asOf,
  lookups,
}: {
  lesson: Lesson;
  happeningNow: boolean;
  today: string;
  asOf: Instant;
  lookups: ReturnType<typeof useLookups>;
}) {
  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const school = lookups.schoolOfRoom(lesson.roomId);
  const wait = happeningNow ? null : formatDuration(minutesUntil(asOf, lesson));
  const summary = formatBannerLine({
    program: group?.program,
    code: group?.code,
    schoolName: school?.name,
    campusName: campus?.name,
    roomName: room?.name,
  });

  return (
    <article
      className="teacher-next"
      aria-label={happeningNow ? "Happening now" : "Next lesson"}
    >
      <p className="teacher-next__lead">
        <span className="teacher-next__kicker">
          {happeningNow ? "Happening now" : "Next up"}
        </span>
        {wait && <span className="teacher-next__wait">in {wait}</span>}
      </p>
      <p className="teacher-next__time cf-mono">
        {lesson.date !== today && (
          <span className="teacher-next__date">
            {format(parseISO(lesson.date), DAY_HEADING)}
          </span>
        )}
        {formatRange(lesson.startMin, lesson.endMin)}
      </p>
      {summary && <p className="teacher-next__summary">{summary}</p>}
    </article>
  );
}
