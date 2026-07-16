"use client";

import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import { useLookups } from "@/data/hooks";
import { formatMin, formatRange } from "@/domain/time";
import { Badge, schoolClass } from "@/components/Badge";
import { LANE_EDGE_PX } from "./laneLayout";

/** Single source of truth for vertical time scale (gutter, gridlines, events). */
export const PX_PER_MIN = 1.5;

interface Props {
  lesson: Lesson;
  lane: number;
  laneCount: number;
  /** Map a minute-of-day to Y within the day column. */
  minuteToY: (min: number) => number;
  /** Pixel height of a [start, end) minute range on the scale. */
  rangeHeight: (startMin: number, endMin: number) => number;
  conflicts: Conflict[];
  lookups: ReturnType<typeof useLookups>;
  selected?: boolean;
  /** Pulse outline when this card is part of a focused travel gap. */
  travelHighlighted?: boolean;
  onSelect?: (lesson: Lesson, el: HTMLElement) => void;
}

/**
 * Equal-width lanes packed flush inside a day column.
 * card_width = (column − edge insets) / laneCount; x = lane × card_width.
 */
export function laneStyle(lane: number, laneCount: number): { left: string; width: string } {
  const edge = LANE_EDGE_PX;
  if (laneCount <= 1) {
    return { left: `${edge}px`, width: `calc(100% - ${2 * edge}px)` };
  }
  const usable = `100% - ${2 * edge}px`;
  const width = `calc((${usable}) / ${laneCount})`;
  const left = `calc(${edge}px + ${lane} * (${usable}) / ${laneCount})`;
  return { left, width };
}

function lessonTooltip(parts: {
  code?: string;
  range: string;
  teacher?: string;
  room?: string;
  cmName?: string;
  curriculum: string;
  status?: string;
}): string {
  const head = [parts.code, parts.range].filter(Boolean).join(" ");
  const mid = [parts.teacher, parts.room, parts.cmName ? `+${parts.cmName}` : null]
    .filter(Boolean)
    .join(" · ");
  return [head, mid, parts.curriculum, parts.status].filter(Boolean).join(" — ");
}

/**
 * A lesson on the ruler. Vertical geometry comes from the time scale;
 * horizontal geometry from lane layout.
 *
 * Content is tiered and size-adaptive (see `.cf-lesson` in globals.css):
 * T1 always (code + start), then teacher → room → curriculum, dropped
 * whole tiers bottom-up. Never ellipsizes time or teacher codes.
 */
export const LessonBlock = forwardRef<HTMLButtonElement, Props>(function LessonBlock(
  {
    lesson,
    lane,
    laneCount,
    minuteToY,
    rangeHeight,
    conflicts,
    lookups,
    selected,
    travelHighlighted = false,
    onSelect,
  },
  ref
) {
  const school = lookups.schoolOfRoom(lesson.roomId);
  const room = lookups.roomsById.get(lesson.roomId);
  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const teacher = lookups.teachersById.get(lesson.teacherId);

  const top = minuteToY(lesson.startMin);
  const height = rangeHeight(lesson.startMin, lesson.endMin);
  const { left, width } = laneStyle(lane, laneCount);
  const multiLane = laneCount > 1;
  const localRef = useRef<HTMLButtonElement | null>(null);
  const [domLaneLabel, setDomLaneLabel] = useState("…");

  // TEMP DEBUG — read layout from the live DOM node, then revert.
  useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const laneAttr = el.getAttribute("data-lane") ?? "?";
    const countAttr = el.getAttribute("data-lane-count") ?? "?";
    setDomLaneLabel(
      `${laneAttr}/${countAttr} L:${cs.left} W:${cs.width}`
    );
  }, [lane, laneCount, left, width, top]);

  const isOff = lesson.status !== "scheduled";
  const hasOverlap = conflicts.some((c) => c.type === "overlap");
  const hasTravel = conflicts.some((c) => c.type === "travel");

  const startLabel = formatMin(lesson.startMin);
  const rangeLabel = formatRange(lesson.startMin, lesson.endMin);
  const title = lessonTooltip({
    code: group?.code,
    range: rangeLabel,
    teacher: teacher?.code,
    room: room?.name,
    cmName: lesson.cmName,
    curriculum: lesson.curriculum,
    status: isOff ? lesson.status : undefined,
  });

  return (
    <button
      ref={(node) => {
        localRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      title={title}
      onClick={(e) => onSelect?.(lesson, e.currentTarget)}
      data-lesson-id={lesson.id}
      data-lane={lane}
      data-selected={selected || undefined}
      data-conflict={hasOverlap || undefined}
      data-cancelled={isOff || undefined}
      className={`cf-lesson cf-card ${schoolClass(school)} group absolute overflow-hidden rounded-sm text-left ${
        multiLane ? "cf-lesson--lanes" : ""
      } ${travelHighlighted ? "cf-travel-pulse z-10 ring-2 ring-warn" : ""}`}
      data-lane-count={laneCount}
      style={{
        top,
        height: Math.max(height, 18),
        left,
        width,
        minWidth: 0,
        borderLeft: hasOverlap
          ? undefined
          : `3px solid ${isOff ? "var(--line)" : "var(--school)"}`,
      }}
      aria-label={`${group?.code ?? "Lesson"} ${rangeLabel}${isOff ? `, ${lesson.status}` : ""}`}
    >
      {/* TEMP DEBUG OVERLAY — DOM-sourced lane geometry */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 z-50 max-w-full truncate bg-black/80 px-0.5 font-mono text-[8px] leading-tight text-lime-300"
      >
        {domLaneLabel}
      </span>
      <div className="cf-lesson__body">
        {/* T1 — always: course code + start time (complete tokens only) */}
        <div className="cf-lesson__t1">
          <span
            className={`cf-lesson__code cf-mono font-semibold ${isOff ? "text-ink-faint line-through decoration-danger/60" : ""}`}
            style={isOff ? undefined : { color: "var(--school)" }}
          >
            {group?.code}
          </span>
          <span
            className={`cf-lesson__time cf-card__time cf-mono ${isOff ? "text-ink-faint" : "text-ink-mute"}`}
          >
            {startLabel}
          </span>
          {hasTravel && !isOff && (
            <Badge
              size="xs"
              tone="conflict"
              className="cf-lesson__flag"
              title="Tight travel gap to the next campus"
            >
              travel
            </Badge>
          )}
          {hasOverlap && !isOff && !hasTravel && (
            <Badge size="xs" tone="conflict" className="cf-lesson__flag" title="Double-booked">
              conflict
            </Badge>
          )}
          {isOff && (
            <Badge size="xs" tone="cancelled" className="cf-lesson__flag">
              {lesson.status === "cancelled" ? "cancelled" : "no-show"}
            </Badge>
          )}
        </div>

        {/* T2 — teacher code; dropped whole when it won't fit */}
        {teacher?.code && (
          <div className={`cf-lesson__t2 cf-mono font-medium ${isOff ? "text-ink-faint" : "text-ink"}`}>
            {teacher.code}
          </div>
        )}

        {/* T3 — room badge (+ CM when present); never mid-token ellipsis */}
        {room?.name && (
          <div className="cf-lesson__t3">
            <Badge
              size="xs"
              tone="room"
              className={`cf-lesson__room ${isOff ? "bg-transparent! text-ink-faint" : ""}`}
            >
              {room.name}
            </Badge>
            {lesson.cmName && (
              <span className={`cf-lesson__cm cf-mono ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
                +{lesson.cmName}
              </span>
            )}
          </div>
        )}

        {/* T4 — program / material line */}
        <div className={`cf-lesson__t4 ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
          {lesson.curriculum}
        </div>
      </div>
    </button>
  );
});
