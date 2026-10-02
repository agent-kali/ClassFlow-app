"use client";

import type { CSSProperties } from "react";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatAgendaMin } from "@/domain/time";
import { useLocale } from "@/features/landing/locale";
import { agendaStatuses, agendaStatusTexts } from "./dayAgenda";
import { getManagerCopy } from "./copy";
import { accentForSchool, isLessonPast } from "./lessonCardModel";
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
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);
  const { lesson } = block;
  const school = lookups.schoolOfRoom(lesson.roomId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const group = lookups.classGroupsById.get(lesson.classGroupId);

  const isOff = lesson.status !== "scheduled";
  const isPast = isLessonPast(lesson, today, nowMin) || isOff;
  const statuses = agendaStatuses(lesson, conflicts);
  const hasConflict = statuses.some((status) => status.kind === "double-booking");
  const hasTravel = statuses.some((status) => status.kind === "tight-travel");
  const statusTexts = agendaStatusTexts(statuses, {
    cancelled: copy.cancelledCard,
    noShow: copy.noShowCard,
    doubleBooking: copy.doubleBookingCard,
    tightTravel: copy.tightTravelCard,
  });

  const classCode = group?.code ?? copy.lessonFallback;
  const timeLabel = `${formatAgendaMin(lesson.startMin)} — ${formatAgendaMin(lesson.endMin)}`;
  const campusName = campus?.name ?? school?.shortName;
  const where = [campusName, room?.name].filter(Boolean).join(" · ");

  const pxWidth = block.width * trackWidthPx;
  const tier: DayBlockTier = metadataTier(pxWidth);
  // The narrowest legible block still names its campus; the room is the first
  // thing to go. The agenda beside the scale carries the full names.
  const whereShown = tier === "narrow" ? campusName : where;

  const blockStatusKind =
    statuses[0]?.kind === "cancelled"
      ? "cancelled"
      : statuses[0]?.kind === "no-show"
        ? "noshow"
        : hasConflict
          ? "conflict"
          : hasTravel
            ? "travel"
            : null;
  const blockStatusText =
    blockStatusKind === "cancelled"
      ? copy.cancelledCard
      : blockStatusKind === "noshow"
        ? copy.noShowCard
        : blockStatusKind === "conflict"
          ? copy.doubleBookingCard
          : blockStatusKind === "travel"
            ? copy.tightTravelShort
            : null;
  const spellOutStatus = tier === "full" && pxWidth >= TIER_STATUS_PX && !!blockStatusText;

  const label = [
    classCode,
    timeLabel,
    copy.duration(lesson.endMin - lesson.startMin),
    where,
    ...statusTexts,
    !isOff && isPast ? copy.completed : "",
    isSelected ? copy.selected : "",
  ]
    .filter(Boolean)
    .join(", ");

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
      data-status={isOff ? lesson.status : undefined}
      data-conflict={hasConflict || undefined}
      data-travel={hasTravel || undefined}
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
              {spellOutStatus && blockStatusText && (
                <span className={`day-lesson__status day-lesson__status--${blockStatusKind}`}>
                  {blockStatusText}
                </span>
              )}
            </span>
          )}
          <span className="day-lesson__class">{classCode}</span>
          {whereShown && <span className="day-lesson__where">{whereShown}</span>}
        </span>
      )}
    </div>
  );
}
