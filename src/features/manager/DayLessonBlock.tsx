"use client";

import type { CSSProperties } from "react";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatAgendaMin, formatDuration } from "@/domain/time";
import { accentForSchool, hasOverlapConflict, isLessonPast } from "./lessonCardModel";
import {
  DAY_BLOCK_HEIGHT,
  TIER_STATUS_PX,
  laneTop,
  metadataTier,
  type DayBlock,
  type DayBlockTier,
} from "./dayTimelineLayout";

interface Props {
  block: DayBlock;
  laneCount: number;
  /** Width of the whole time track, so the block can budget its own text. */
  trackWidthPx: number;
  conflicts: Conflict[];
  lookups: ReturnType<typeof useLookups>;
  today: string;
  nowMin: number | null;
  isSelected: boolean;
  isFocused: boolean;
  isDragging: boolean;
  onSelect?: (lesson: Lesson, el: HTMLElement) => void;
  onDragStart?: (lesson: Lesson, e: React.PointerEvent<HTMLElement>) => void;
}

/**
 * A lesson on the resource timeline. Its width is its real duration, so the
 * text has to give way rather than the geometry — detail drops out tier by
 * tier and the full story stays in the tooltip, the label, and the popover.
 */
export function DayLessonBlock({
  block,
  laneCount,
  trackWidthPx,
  conflicts,
  lookups,
  today,
  nowMin,
  isSelected,
  isFocused,
  isDragging,
  onSelect,
  onDragStart,
}: Props) {
  const { lesson } = block;
  const school = lookups.schoolOfRoom(lesson.roomId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const group = lookups.classGroupsById.get(lesson.classGroupId);

  const isOff = lesson.status !== "scheduled";
  const isPast = isLessonPast(lesson, today, nowMin) || isOff;
  const hasConflict = !isOff && hasOverlapConflict(conflicts);
  const travelConflict = !isOff ? conflicts.find((c) => c.type === "travel") : undefined;

  const classCode = group?.code ?? "Lesson";
  const timeLabel = `${formatAgendaMin(lesson.startMin)} — ${formatAgendaMin(lesson.endMin)}`;
  const campusName = campus?.name ?? school?.shortName;
  const where = [campusName, room?.name].filter(Boolean).join(" · ");

  const pxWidth = block.width * trackWidthPx;
  const tier: DayBlockTier = metadataTier(pxWidth);
  // The narrowest legible block still names its campus; the room is the first
  // thing to go, because the popover is one click away.
  const whereShown = tier === "narrow" ? campusName : where;

  const statusKind = hasConflict ? "conflict" : travelConflict ? "travel" : null;
  const statusText = hasConflict ? "Double booking" : travelConflict ? "Tight travel" : null;
  const spellOutStatus = tier === "full" && pxWidth >= TIER_STATUS_PX;

  const label =
    `${classCode}, ${timeLabel}, ${formatDuration(lesson.endMin - lesson.startMin)}` +
    (where ? `, ${where}` : "") +
    (hasConflict ? ", conflict — double booking" : "") +
    (travelConflict ? `, tight travel, ${travelConflict.gapMin} minutes` : "") +
    (isOff ? `, ${lesson.status}` : isPast ? ", completed" : "") +
    (isSelected ? ", selected" : "");

  return (
    <div
      className="day-lesson"
      style={
        {
          "--lc-accent": accentForSchool(school?.color, isOff, isPast && !isOff),
          left: `${block.left * 100}%`,
          width: `${block.width * 100}%`,
          top: laneTop(block.lane, laneCount),
          height: DAY_BLOCK_HEIGHT,
        } as CSSProperties
      }
      data-lesson-id={lesson.id}
      data-tier={tier}
      data-past={isPast || undefined}
      data-conflict={hasConflict || undefined}
      data-travel={travelConflict ? true : undefined}
      data-selected={isSelected || undefined}
      data-focused={isFocused || undefined}
      data-dragging={isDragging || undefined}
      tabIndex={0}
      role="button"
      aria-label={label}
      title={label}
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
      <span className="day-lesson__rail" aria-hidden />
      {tier !== "bare" && (
        <span className="day-lesson__body">
          {tier === "full" && (
            <span className="day-lesson__top">
              <span className="day-lesson__time cf-mono">{timeLabel}</span>
              {spellOutStatus && statusText && (
                <span className={`day-lesson__status day-lesson__status--${statusKind}`}>
                  {statusText}
                </span>
              )}
            </span>
          )}
          <span className="day-lesson__class">
            {classCode}
            {!spellOutStatus && statusKind && (
              <span
                className={`day-lesson__flag day-lesson__flag--${statusKind}`}
                aria-hidden
              >
                !
              </span>
            )}
          </span>
          {whereShown && <span className="day-lesson__where">{whereShown}</span>}
        </span>
      )}
    </div>
  );
}
