"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { format, parseISO } from "date-fns";
import type { Lesson } from "@/domain/types";
import { lessonHours } from "@/domain/types";
import { useConflicts, useLessonMutations, useLessons, useLookups } from "@/data/hooks";
import { isTeacherOverlap, overlapMinutes } from "@/domain/conflicts";
import { formatMin, formatRange, parseTime, weekDates } from "@/domain/time";
import { Badge } from "@/components/Badge";
import { MoneyPair } from "@/components/MoneyPair";
import { SchoolChip } from "@/components/SchoolChip";
import { LessonEditForm } from "./LessonEditForm";

interface Props {
  lesson: Lesson;
  anchorRect: DOMRect;
  /** The week whose days the move form offers; defaults to the lesson's week. */
  weekOf?: string;
  onClose: () => void;
  /** Called before a pay-affecting action, so the page can flash the delta. */
  onAction?: () => void;
  /** Jump to the other lesson in a teacher double-booking. */
  onViewConflictingLesson?: (lessonId: string) => void;
  /** Render above the guided-tour click blocker (z-80). */
  stackAboveTour?: boolean;
}

/**
 * The manager's most frequent surface. One click opened it; cancelling is
 * one more. Rescheduling is inline — day, exact times, done.
 */
export function LessonPopover({
  lesson,
  anchorRect,
  weekOf,
  onClose,
  onAction,
  onViewConflictingLesson,
  stackAboveTour = false,
}: Props) {
  const lookups = useLookups();
  const lessons = useLessons();
  const { byLesson } = useConflicts();
  const { setLessonStatus, rescheduleLesson } = useLessonMutations();

  /** One popover, three faces: read the lesson, move it, or edit it in full. */
  const [mode, setMode] = useState<"details" | "move" | "edit">("details");
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
  const days = weekDates(parseISO(weekOf ?? lesson.date));

  const teacherOverlaps = useMemo(() => {
    if (isOff) return [];
    const cs = byLesson.get(lesson.id) ?? [];
    const out: {
      other: Lesson;
      overlapMin: number;
      overlapStart: number;
      overlapEnd: number;
    }[] = [];
    for (const c of cs) {
      if (!isTeacherOverlap(c)) continue;
      const otherId = c.lessonIds[0] === lesson.id ? c.lessonIds[1] : c.lessonIds[0];
      const other = lessons.find((l) => l.id === otherId);
      if (!other || other.status !== "scheduled") continue;
      const overlapStart = Math.max(lesson.startMin, other.startMin);
      const overlapEnd = Math.min(lesson.endMin, other.endMin);
      out.push({
        other,
        overlapMin: overlapMinutes(lesson, other),
        overlapStart,
        overlapEnd,
      });
    }
    return out;
  }, [byLesson, isOff, lesson, lessons]);

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
          data-tour-allowed={stackAboveTour ? "" : undefined}
          side="right"
          align="start"
          collisionPadding={8}
          sideOffset={6}
          className={`${stackAboveTour ? "z-[85]" : "z-50"} ${
            mode === "edit"
              ? "w-80 max-h-(--radix-popover-content-available-height) overflow-y-auto"
              : "w-72"
          } rounded-md border border-line bg-raised p-3`}
          style={{ boxShadow: "var(--shadow-pop)" }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="cf-mono text-[15px] font-bold">{group?.code}</span>
            <SchoolChip school={school} />
            {isOff && (
              <Badge size="sm" tone="cancelled">
                {lesson.status}
              </Badge>
            )}
          </div>
          <p className="text-[12px] text-ink-mute">
            {group?.program} · {group?.level}
          </p>

          {mode === "edit" ? (
            <LessonEditForm
              lesson={lesson}
              weekOf={weekOf}
              onCancel={() => setMode("details")}
              onBeforeSave={onAction}
              onSaved={onClose}
            />
          ) : (
            <>
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

              {teacherOverlaps.map((overlap) => {
                const otherGroup = lookups.classGroupsById.get(overlap.other.classGroupId);
                const otherRoom = lookups.roomsById.get(overlap.other.roomId);
                const otherCampus = lookups.campusOfRoom(overlap.other.roomId);
                const otherRange = formatRange(overlap.other.startMin, overlap.other.endMin);
                const overlapRange = formatRange(overlap.overlapStart, overlap.overlapEnd);
                const location = [otherCampus?.name, otherRoom?.name].filter(Boolean).join(" · ");
                return (
                  <div
                    key={overlap.other.id}
                    className="mt-2.5 rounded border border-danger/25 bg-danger-soft px-2.5 py-2"
                  >
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-danger">
                      <span aria-hidden>⚠</span>
                      Double booking
                    </div>
                    <p className="mt-1 text-[12px] text-ink">
                      <span className="cf-mono font-medium">{teacher?.code ?? "?"}</span>
                      {" is also teaching "}
                      <span className="cf-mono font-medium">{otherGroup?.code ?? "another class"}</span>
                    </p>
                    <p className="cf-mono text-[12px]">{otherRange}</p>
                    {location && (
                      <p className="text-[12px] text-ink-mute">{location}</p>
                    )}
                    <p className="mt-1 text-[12px] text-ink">
                      Overlap:{" "}
                      {overlapRange !== otherRange ? `${overlapRange} · ` : ""}
                      {overlap.overlapMin} min
                    </p>
                    {onViewConflictingLesson && (
                      <button
                        type="button"
                        className="mt-1.5 text-[12px] font-medium text-accent hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onViewConflictingLesson(overlap.other.id);
                        }}
                      >
                        View conflicting lesson
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="mt-2.5 flex items-center justify-between rounded bg-surface px-2 py-1.5">
                <span className="text-[11px] text-ink-mute">
                  {isOff ? "Not paid — didn't happen" : `${lessonHours(lesson)}h × ${teacher?.code}'s rate`}
                </span>
                <MoneyPair usd={usd} size="sm" align="right" struck={isOff} />
              </div>

              {mode === "details" ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button type="button" className={actionBtn} onClick={() => setMode("edit")}>
                    Edit lesson
                  </button>
                  {!isOff ? (
                    <>
                      <button type="button" className={actionBtn} onClick={() => setMode("move")}>
                        Move…
                      </button>
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
                    <button type="button" className={actionBtn} onClick={() => setMode("details")}>
                      Keep as is
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
