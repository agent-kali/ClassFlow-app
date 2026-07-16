"use client";

import { forwardRef, useLayoutEffect, useRef } from "react";
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
  const measureRef = useRef<HTMLButtonElement | null>(null);

  // #region agent log
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || laneCount <= 1) return;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const parent = el.parentElement;
    const parentW = parent?.getBoundingClientRect().width ?? 0;
    const siblings = parent
      ? [...parent.querySelectorAll<HTMLElement>("[data-lane-count]")].filter(
          (n) => n.getAttribute("data-lane-count") === String(laneCount)
        )
      : [];
    const overlapPx = siblings
      .filter((n) => n !== el)
      .map((n) => {
        const r = n.getBoundingClientRect();
        const xOverlap = Math.min(rect.right, r.right) - Math.max(rect.left, r.left);
        return xOverlap > 0.5 ? xOverlap : 0;
      })
      .reduce((a, b) => Math.max(a, b), 0);
  fetch('http://127.0.0.1:7900/ingest/9cc422f0-d1c4-451e-8dd5-56e6e56cfb46',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cd3cd2'},body:JSON.stringify({sessionId:'cd3cd2',runId:'pre-fix',hypothesisId:'H1',location:'LessonBlock.tsx:useLayoutEffect',message:'multi-lane geometry',data:{lessonId:lesson.id,lane,laneCount,styleLeft:left,styleWidth:width,computedLeft:cs.left,computedWidth:cs.width,rectW:rect.width,rectLeft:rect.left,parentW,overlapPx,siblingCount:siblings.length},timestamp:Date.now()})}).catch(()=>{});
    if (!group?.code || !teacher?.code || !room?.name) {
      fetch('http://127.0.0.1:7900/ingest/9cc422f0-d1c4-451e-8dd5-56e6e56cfb46',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cd3cd2'},body:JSON.stringify({sessionId:'cd3cd2',runId:'pre-fix',hypothesisId:'H4',location:'LessonBlock.tsx:useLayoutEffect',message:'missing lookup data',data:{lessonId:lesson.id,hasGroup:!!group?.code,hasTeacher:!!teacher?.code,hasRoom:!!room?.name},timestamp:Date.now()})}).catch(()=>{});
    }
    if (rect.width > 0 && rect.width < 84 && laneCount > 1) {
      fetch('http://127.0.0.1:7900/ingest/9cc422f0-d1c4-451e-8dd5-56e6e56cfb46',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cd3cd2'},body:JSON.stringify({sessionId:'cd3cd2',runId:'pre-fix',hypothesisId:'H3',location:'LessonBlock.tsx:useLayoutEffect',message:'narrow multi-lane card',data:{lessonId:lesson.id,lane,laneCount,rectW:rect.width,height:rect.height},timestamp:Date.now()})}).catch(()=>{});
    }
  }, [lane, laneCount, left, width, lesson.id]);
  // #endregion

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
        measureRef.current = node;
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
