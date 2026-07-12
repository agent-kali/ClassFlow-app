"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import type { Lesson } from "@/domain/types";
import type { useLookups } from "@/data/hooks";
import { formatRange } from "@/domain/time";
import { Badge, schoolClass } from "@/components/Badge";
import { LANE_EDGE_PX } from "./laneLayout";

/** @deprecated Overflow lanes are rendered inline; chip kept for reference. */
const OVERFLOW_STRIP_PX = 20;

export interface OverflowGroup {
  id: string;
  lessons: Lesson[];
  startMin: number;
  endMin: number;
}

interface Props {
  group: OverflowGroup;
  minuteToY: (min: number) => number;
  rangeHeight: (startMin: number, endMin: number) => number;
  lookups: ReturnType<typeof useLookups>;
  onSelect?: (lesson: Lesson, el: HTMLElement) => void;
}

/** Collapsed "+N" control for lessons beyond the visible lane cap. */
export function OverflowChip({ group, minuteToY, rangeHeight, lookups, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const top = minuteToY(group.startMin);
  const height = Math.max(rangeHeight(group.startMin, group.endMin), 22);
  const n = group.lessons.length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="absolute z-10 flex items-center justify-center rounded-sm border border-line bg-raised hover:border-ink-faint"
          style={{
            top,
            height,
            right: LANE_EDGE_PX,
            width: OVERFLOW_STRIP_PX - 2,
          }}
          aria-label={`${n} more overlapping lesson${n > 1 ? "s" : ""}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Badge size="xs" tone="count" countKind="danger" className="bg-transparent! text-ink-mute">
            +{n}
          </Badge>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={4}
          className="z-50 w-56 rounded-md border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="cf-mono px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            +{n} more
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.lessons.map((lesson) => {
              const school = lookups.schoolOfRoom(lesson.roomId);
              const groupInfo = lookups.classGroupsById.get(lesson.classGroupId);
              const teacher = lookups.teachersById.get(lesson.teacherId);
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    className={`${schoolClass(school)} flex w-full flex-col gap-0.5 rounded-sm border border-line-soft bg-raised px-1.5 py-1 text-left hover:border-ink-faint`}
                    style={{ borderLeft: "3px solid var(--school)" }}
                    onClick={(e) => {
                      setOpen(false);
                      onSelect?.(lesson, e.currentTarget);
                    }}
                  >
                    <span className="cf-mono text-[11px] font-semibold" style={{ color: "var(--school)" }}>
                      {groupInfo?.code}
                    </span>
                    <span className="cf-mono text-[10px] text-ink-mute">
                      {formatRange(lesson.startMin, lesson.endMin)}
                      {teacher ? ` · ${teacher.code}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
