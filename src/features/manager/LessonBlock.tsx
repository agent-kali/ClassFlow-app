"use client";

import { forwardRef } from "react";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import { useLookups } from "@/data/hooks";
import { formatRange } from "@/domain/time";
import { schoolClass } from "@/components/SchoolChip";

export const PX_PER_MIN = 1.5;

interface Props {
  lesson: Lesson;
  lane: number;
  laneCount: number;
  topMin: number;
  conflicts: Conflict[];
  lookups: ReturnType<typeof useLookups>;
  selected?: boolean;
  onSelect?: (lesson: Lesson, el: HTMLElement) => void;
}

/**
 * A lesson on the ruler. Its height is literally its duration; its top is
 * its true start minute. Struck/dimmed is reserved exclusively for
 * cancelled and no-show; delivered lessons stay settled and solid.
 */
export const LessonBlock = forwardRef<HTMLButtonElement, Props>(function LessonBlock(
  { lesson, lane, laneCount, topMin, conflicts, lookups, selected, onSelect },
  ref
) {
  const school = lookups.schoolOfRoom(lesson.roomId);
  const room = lookups.roomsById.get(lesson.roomId);
  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const teacher = lookups.teachersById.get(lesson.teacherId);

  const top = (lesson.startMin - topMin) * PX_PER_MIN;
  const height = (lesson.endMin - lesson.startMin) * PX_PER_MIN;
  const widthPct = 100 / laneCount;

  const isOff = lesson.status !== "scheduled";
  const hasOverlap = conflicts.some((c) => c.type === "overlap");
  const hasTravel = conflicts.some((c) => c.type === "travel");

  const durationMin = lesson.endMin - lesson.startMin;
  const compact = durationMin < 50;

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => onSelect?.(lesson, e.currentTarget)}
      className={`${schoolClass(school)} group absolute overflow-hidden rounded-sm border text-left transition-shadow focus-visible:outline-2 focus-visible:outline-accent ${
        isOff
          ? "border-line bg-surface opacity-75"
          : "border-line-soft bg-raised shadow-[0_1px_3px_rgba(35,32,26,0.1)] hover:shadow-[0_3px_10px_rgba(35,32,26,0.18)]"
      } ${hasOverlap ? "border-danger! shadow-[inset_2px_0_0_var(--danger)]" : ""} ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      style={{
        top,
        height: Math.max(height, 18),
        left: `calc(${lane * widthPct}% + 1px)`,
        width: `calc(${widthPct}% - 3px)`,
        borderLeft: hasOverlap ? undefined : `3px solid ${isOff ? "var(--line)" : "var(--school)"}`,
      }}
      aria-label={`${group?.code ?? "Lesson"} ${formatRange(lesson.startMin, lesson.endMin)}${isOff ? `, ${lesson.status}` : ""}`}
    >
      <div className={`flex h-full flex-col px-1.5 ${compact ? "py-0.5" : "py-1"}`}>
        <div className="flex items-baseline gap-1.5 leading-tight">
          <span
            className={`cf-mono text-[11px] font-semibold ${isOff ? "text-ink-faint line-through decoration-danger/60" : ""}`}
            style={isOff ? undefined : { color: "var(--school)" }}
          >
            {group?.code}
          </span>
          <span className={`cf-mono text-[10px] ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
            {formatRange(lesson.startMin, lesson.endMin)}
          </span>
          {hasTravel && !isOff && (
            <span
              className="cf-mono ml-auto shrink-0 rounded-sm px-1 text-[9px] font-bold uppercase"
              style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
              title="Tight travel gap to the next campus"
            >
              travel
            </span>
          )}
          {isOff && (
            <span
              className="cf-mono ml-auto shrink-0 rounded-sm px-1 text-[9px] font-bold uppercase"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {lesson.status === "cancelled" ? "cancelled" : "no-show"}
            </span>
          )}
        </div>
        {!compact && (
          <div className={`mt-0.5 truncate text-[10px] leading-tight ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
            {lesson.curriculum}
          </div>
        )}
        <div className="mt-auto flex items-baseline gap-1.5 leading-tight">
          <span className={`cf-mono text-[10px] font-medium ${isOff ? "text-ink-faint" : ""}`}>
            {teacher?.code}
          </span>
          <span className={`cf-mono truncate text-[10px] ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
            {room?.name}
          </span>
          {lesson.cmName && !compact && (
            <span className={`cf-mono truncate text-[10px] ${isOff ? "text-ink-faint" : "text-ink-mute"}`}>
              +{lesson.cmName}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});
