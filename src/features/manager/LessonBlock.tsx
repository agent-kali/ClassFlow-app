"use client";

import type { CSSProperties } from "react";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatAgendaMin } from "@/domain/time";
import { useLocale } from "@/features/landing/locale";
import { getManagerCopy } from "./copy";
import { accentForSchool, hasOverlapConflict, isLessonPast } from "./lessonCardModel";

interface Props {
  lesson: Lesson;
  conflicts: Conflict[];
  lookups: ReturnType<typeof useLookups>;
  today: string;
  nowMin: number | null;
  isSelected: boolean;
  travelHighlighted?: boolean;
  travelGapKey?: string;
  conflictHighlighted?: boolean;
  conflictFocusNonce?: number;
  tourTarget?: boolean;
  isDragging?: boolean;
  onSelect?: (lesson: Lesson, el: HTMLElement) => void;
  onDragStart?: (lesson: Lesson, e: React.PointerEvent<HTMLElement>) => void;
}

export function LessonBlock({
  lesson,
  conflicts,
  lookups,
  today,
  nowMin,
  isSelected,
  travelHighlighted = false,
  travelGapKey,
  conflictHighlighted = false,
  conflictFocusNonce = 0,
  tourTarget = false,
  isDragging = false,
  onSelect,
  onDragStart,
}: Props) {
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);
  const school = lookups.schoolOfRoom(lesson.roomId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const teacher = lookups.teachersById.get(lesson.teacherId);

  const isOff = lesson.status !== "scheduled";
  const isPast = isLessonPast(lesson, today, nowMin) || isOff;
  const hasConflict = !isOff && hasOverlapConflict(conflicts);
  const travelConflict = !isOff ? conflicts.find((c) => c.type === "travel") : undefined;

  const teacherCode = (teacher?.code ?? "?").slice(0, 3).toUpperCase();
  const classCode = group?.code ?? "Lesson";
  const location = [campus?.name ?? school?.shortName, room?.name].filter(Boolean).join(" · ");
  const timeLabel = `${formatAgendaMin(lesson.startMin)} — ${formatAgendaMin(lesson.endMin)}`;

  const accent = accentForSchool(school?.color, isOff, isPast && !isOff);

  const label =
    `${classCode}, ${timeLabel}, ${teacherCode}${location ? `, ${location}` : ""}` +
    (hasConflict ? ", conflict — double booking" : "") +
    (travelConflict ? ", tight travel" : "") +
    (isPast ? ", completed" : "") +
    (isSelected ? ", selected" : "");

  const statusKind = hasConflict ? "conflict" : travelConflict ? "travel" : null;
  const statusText = hasConflict
    ? copy.doubleBookingCard
    : travelConflict
      ? copy.tightTravelCard(travelConflict.gapMin)
      : null;

  return (
    <div
      className={`lesson-card ${travelHighlighted ? "lesson-card--travel-focus" : ""} ${conflictHighlighted ? "lesson-card--conflict-focus" : ""} ${isDragging ? "lesson-card--dragging" : ""}`}
      style={{ "--lc-accent": accent } as CSSProperties}
      data-past={isPast || undefined}
      data-conflict={hasConflict || undefined}
      data-travel={travelConflict ? true : undefined}
      data-selected={isSelected}
      data-lesson-id={lesson.id}
      data-travel-gap={travelGapKey}
      data-tour={tourTarget ? "lesson-edit" : undefined}
      tabIndex={0}
      role="button"
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        onDragStart?.(lesson, e);
      }}
      onClick={(e) => {
        if (isDragging) return;
        onSelect?.(lesson, e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(lesson, e.currentTarget);
        }
      }}
    >
      <div className="lesson-card__surface">
        {conflictHighlighted && conflictFocusNonce > 0 && (
          <span key={conflictFocusNonce} className="lesson-card__focus-pulse" aria-hidden />
        )}
        {statusKind && <div className={`lesson-card__accent lesson-card__accent--${statusKind}`} />}
        <div className="lesson-card__body">
          <div className="lesson-card__time cf-mono">
            <span className="lesson-card__time-start">{formatAgendaMin(lesson.startMin)}</span>
            <span className="lesson-card__time-sep"> — </span>
            <span className="lesson-card__time-end">{formatAgendaMin(lesson.endMin)}</span>
          </div>
          <div className="lesson-card__meta">
            <span className="lesson-card__teacher cf-mono">{teacherCode}</span>
            <span className="lesson-card__class">{classCode}</span>
          </div>
          {location && <div className="lesson-card__location">{location}</div>}
          {statusText && (
            <div className={`lesson-card__status lesson-card__status--${statusKind}`}>
              {statusText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
