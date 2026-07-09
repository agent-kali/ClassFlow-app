"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { format, parseISO } from "date-fns";
import type { Lesson } from "@/domain/types";
import { lessonHours } from "@/domain/types";
import { useLessonMutations, useLookups, useToday } from "@/data/hooks";
import { formatMin, formatRange, parseTime, weekDates } from "@/domain/time";
import { MoneyPair } from "@/components/MoneyPair";
import { SchoolChip } from "@/components/SchoolChip";

interface Props {
  lesson: Lesson;
  anchorRect: DOMRect;
  onClose: () => void;
  /** Called before a pay-affecting action, so the page can flash the delta. */
  onAction?: () => void;
}

/**
 * The manager's most frequent surface. One click opened it; cancelling is
 * one more. Rescheduling is inline — day, exact times, done.
 */
export function LessonPopover({ lesson, anchorRect, onClose, onAction }: Props) {
  const lookups = useLookups();
  const today = useToday();
  const { setLessonStatus, rescheduleLesson } = useLessonMutations();

  const [rescheduling, setRescheduling] = useState(false);
  const [moveDate, setMoveDate] = useState(lesson.date);
  const [moveStart, setMoveStart] = useState(formatMin(lesson.startMin).padStart(5, "0"));
  const [moveEnd, setMoveEnd] = useState(formatMin(lesson.endMin).padStart(5, "0"));

  const group = lookups.classGroupsById.get(lesson.classGroupId);
  const room = lookups.roomsById.get(lesson.roomId);
  const campus = lookups.campusOfRoom(lesson.roomId);
  const school = lookups.schoolOfRoom(lesson.roomId);
  const teacher = lookups.teachersById.get(lesson.teacherId);

  const isOff = lesson.status !== "scheduled";
  const usd = teacher ? lessonHours(lesson) * teacher.usdRate : 0;
  const days = weekDates(parseISO(today));

  const act = (fn: () => void) => {
    onAction?.();
    fn();
    onClose();
  };

  const actionBtn =
    "rounded border border-line px-2 py-1.5 text-[12px] font-medium transition-colors hover:border-ink-faint";

  return (
    <Popover.Root open onOpenChange={(o) => !o && onClose()}>
      <Popover.Anchor
        style={{
          position: "fixed",
          top: anchorRect.top,
          left: anchorRect.left,
          width: anchorRect.width,
          height: anchorRect.height,
          pointerEvents: "none",
        }}
      />
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          collisionPadding={8}
          sideOffset={6}
          className="z-50 w-72 rounded-md border border-line bg-raised p-3"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="cf-mono text-[15px] font-bold">{group?.code}</span>
            <SchoolChip school={school} />
            {isOff && (
              <span
                className="cf-mono rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                {lesson.status}
              </span>
            )}
          </div>
          <p className="text-[12px] text-ink-mute">
            {group?.program} · {group?.level}
          </p>

          <dl className="mt-2 space-y-1 text-[12px]">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-ink-faint">When</dt>
              <dd className="cf-mono">
                {format(parseISO(lesson.date), "EEE dd/MM")} · {formatRange(lesson.startMin, lesson.endMin)}
                {lesson.weekCode && <span className="ml-1.5 text-ink-mute">{lesson.weekCode}</span>}
              </dd>
            </div>
            {lesson.movedFrom && (
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-ink-faint">Moved</dt>
                <dd className="cf-mono text-ink-mute">
                  from {format(parseISO(lesson.movedFrom.date), "EEE dd/MM")} {formatMin(lesson.movedFrom.startMin)}
                </dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-ink-faint">Where</dt>
              <dd>
                <span className="cf-mono">{room?.name}</span>
                <span className="text-ink-mute"> · {campus?.name}</span>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-ink-faint">Who</dt>
              <dd>
                <span className="cf-mono font-medium">{teacher?.code}</span>
                <span className="text-ink-mute"> {teacher?.name}</span>
                {lesson.cmName && <span className="text-ink-mute"> · CM {lesson.cmName}</span>}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-ink-faint">Teaching</dt>
              <dd className="text-ink">{lesson.curriculum}</dd>
            </div>
          </dl>

          <div className="mt-2.5 flex items-center justify-between rounded bg-surface px-2 py-1.5">
            <span className="text-[11px] text-ink-mute">
              {isOff ? "Not paid — didn't happen" : `${lessonHours(lesson)}h × ${teacher?.code}'s rate`}
            </span>
            <MoneyPair usd={usd} size="sm" align="right" struck={isOff} />
          </div>

          {!rescheduling ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {!isOff ? (
                <>
                  <button
                    type="button"
                    className={`${actionBtn} border-danger/40 text-danger hover:border-danger`}
                    onClick={() => act(() => setLessonStatus(lesson.id, "cancelled"))}
                  >
                    Cancel lesson
                  </button>
                  <button
                    type="button"
                    className={`${actionBtn} text-danger`}
                    onClick={() => act(() => setLessonStatus(lesson.id, "no-show"))}
                  >
                    Mark no-show
                  </button>
                  <button type="button" className={actionBtn} onClick={() => setRescheduling(true)}>
                    Move…
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`${actionBtn} border-accent text-accent`}
                  onClick={() => act(() => setLessonStatus(lesson.id, "scheduled"))}
                >
                  Put it back on the schedule
                </button>
              )}
            </div>
          ) : (
            <form
              className="mt-2.5 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                act(() =>
                  rescheduleLesson(lesson.id, moveDate, parseTime(moveStart), parseTime(moveEnd))
                );
              }}
            >
              <div className="flex gap-1.5">
                <select
                  aria-label="New day"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className="cf-mono flex-1 rounded border border-line bg-raised px-1.5 py-1 text-[12px] focus:border-accent focus:outline-none"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {format(parseISO(d), "EEE dd/MM")}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  aria-label="New start time"
                  value={moveStart}
                  onChange={(e) => e.target.value && setMoveStart(e.target.value)}
                  className="cf-mono rounded border border-line bg-raised px-1.5 py-1 text-[12px] focus:border-accent focus:outline-none"
                  required
                />
                <input
                  type="time"
                  aria-label="New end time"
                  value={moveEnd}
                  onChange={(e) => e.target.value && setMoveEnd(e.target.value)}
                  className="cf-mono rounded border border-line bg-raised px-1.5 py-1 text-[12px] focus:border-accent focus:outline-none"
                  required
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="rounded bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-accent-ink"
                  disabled={parseTime(moveEnd) <= parseTime(moveStart)}
                >
                  Move lesson
                </button>
                <button type="button" className={actionBtn} onClick={() => setRescheduling(false)}>
                  Keep as is
                </button>
              </div>
            </form>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
