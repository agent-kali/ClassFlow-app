"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Conflict } from "@/domain/conflicts";
import {
  MIN_TRAVEL_GAP_MINUTES,
  conflictKey,
  conflictsIntroduced,
  isTeacherOverlap,
} from "@/domain/conflicts";
import type { Lesson, LessonInput } from "@/domain/types";
import { lessonHours } from "@/domain/types";
import { formatDuration, formatMin, formatRange, parseTime, weekDates } from "@/domain/time";
import {
  useCampuses,
  useClassGroups,
  useLessonMutations,
  useLessons,
  useLookups,
  useRooms,
  useTeachers,
} from "@/data/hooks";
import { MoneyPair } from "@/components/MoneyPair";
import { campusShortFromId, travelGapKey, type TravelConflict } from "./travelGap";

interface Props {
  lesson: Lesson;
  /** The week whose days the day picker offers; defaults to the lesson's week. */
  weekOf?: string;
  onCancel: () => void;
  /** Fired just before the mutation, so the page can flash the pay delta. */
  onBeforeSave?: () => void;
  onSaved: () => void;
}

interface Draft {
  teacherId: string;
  classGroupId: string;
  campusId: string;
  roomId: string;
  date: string;
  start: string;
  end: string;
  curriculum: string;
}

/** The conflicts snapshot the warning step reads; frozen when the manager saves. */
interface PendingSave {
  conflicts: Conflict[];
  after: Map<string, Lesson>;
}

/**
 * The details popover, turned over. Same surface, same fields the manager
 * already reads — now typed into. The consequence of the edit (pay, and any
 * conflict it would create) is shown before it is committed, never after.
 */
export function LessonEditForm({ lesson, weekOf, onCancel, onBeforeSave, onSaved }: Props) {
  const lookups = useLookups();
  const lessons = useLessons();
  const teachers = useTeachers();
  const classGroups = useClassGroups();
  const campuses = useCampuses();
  const rooms = useRooms();
  const { editLesson } = useLessonMutations();

  const [draft, setDraft] = useState<Draft>(() => ({
    teacherId: lesson.teacherId,
    classGroupId: lesson.classGroupId,
    campusId: lookups.campusOfRoom(lesson.roomId)?.id ?? "",
    roomId: lesson.roomId,
    date: lesson.date,
    start: formatMin(lesson.startMin).padStart(5, "0"),
    end: formatMin(lesson.endMin).padStart(5, "0"),
    curriculum: lesson.curriculum,
  }));
  const [pending, setPending] = useState<PendingSave | null>(null);
  const warningRef = useRef<HTMLDivElement>(null);

  // In a tall form the warning lands below the fold; bring it to the eye.
  useEffect(() => {
    if (pending) warningRef.current?.scrollIntoView({ block: "end" });
  }, [pending]);

  // Any further change invalidates the warning the manager was looking at.
  const edit = (changes: Partial<Draft>) => {
    setPending(null);
    setDraft((d) => ({ ...d, ...changes }));
  };

  const week = weekDates(parseISO(weekOf ?? lesson.date));
  const days = week.includes(draft.date) ? week : [draft.date, ...week];

  const schoolId = lookups.classGroupsById.get(draft.classGroupId)?.schoolId;
  const campusOptions = campuses.filter((c) => c.schoolId === schoolId);
  const roomOptions = rooms.filter((r) => r.campusId === draft.campusId);

  // A class belongs to one school, so it decides which campuses and rooms exist.
  const changeClass = (classGroupId: string) => {
    const nextSchoolId = lookups.classGroupsById.get(classGroupId)?.schoolId;
    const campusStillValid =
      lookups.campusesById.get(draft.campusId)?.schoolId === nextSchoolId;
    if (campusStillValid) {
      edit({ classGroupId });
      return;
    }
    const campus = campuses.find((c) => c.schoolId === nextSchoolId);
    const room = campus ? rooms.find((r) => r.campusId === campus.id) : undefined;
    edit({
      classGroupId,
      campusId: campus?.id ?? draft.campusId,
      roomId: room?.id ?? draft.roomId,
    });
  };

  const changeCampus = (campusId: string) => {
    const room = rooms.find((r) => r.campusId === campusId);
    edit({ campusId, roomId: room?.id ?? draft.roomId });
  };

  const startMin = parseTime(draft.start);
  const endMin = parseTime(draft.end);
  const teacher = lookups.teachersById.get(draft.teacherId);
  const valid = endMin > startMin && draft.curriculum.trim().length > 0 && !!draft.roomId;
  const previewUsd = teacher && endMin > startMin ? lessonHours({ startMin, endMin }) * teacher.usdRate : 0;

  const patch: Partial<LessonInput> = {
    teacherId: draft.teacherId,
    classGroupId: draft.classGroupId,
    roomId: draft.roomId,
    date: draft.date,
    startMin,
    endMin,
    curriculum: draft.curriculum.trim(),
  };

  // Only escalate the "save anyway" action to red when a stronger conflict is pending.
  const pendingHasHardConflict = pending?.conflicts.some((c) => c.type !== "travel") ?? false;

  const commit = () => {
    onBeforeSave?.();
    editLesson(lesson.id, patch);
    onSaved();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (!pending) {
      const after = lessons.map((l) => (l.id === lesson.id ? { ...l, ...patch } : l));
      const conflicts = conflictsIntroduced(lessons, after, lookups.roomsById, lesson.id);
      if (conflicts.length > 0) {
        setPending({ conflicts, after: new Map(after.map((l) => [l.id, l])) });
        return;
      }
    }
    commit();
  };

  const field = "flex flex-col gap-0.5";
  const fieldLabel = "text-[10px] font-semibold uppercase tracking-wide text-ink-mute";
  const control =
    "w-full rounded border border-line bg-raised px-1.5 py-1 text-[12px] focus:border-accent focus:outline-none";
  const actionBtn =
    "rounded border border-line px-2 py-1.5 text-[12px] font-medium transition-colors hover:border-ink-faint";

  return (
    <form className="mt-2.5 space-y-2" onSubmit={submit}>
      <div className={field}>
        <span className={fieldLabel}>Teacher</span>
        <select
          aria-label="Teacher"
          value={draft.teacherId}
          onChange={(e) => edit({ teacherId: e.target.value })}
          className={control}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} · {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className={field}>
        <span className={fieldLabel}>Class</span>
        <select
          aria-label="Class"
          value={draft.classGroupId}
          onChange={(e) => changeClass(e.target.value)}
          className={`cf-mono ${control}`}
        >
          {classGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.code} — {g.program}
            </option>
          ))}
        </select>
      </div>

      <div className={field}>
        <span className={fieldLabel}>Date</span>
        <select
          aria-label="Date"
          value={draft.date}
          onChange={(e) => edit({ date: e.target.value })}
          className={`cf-mono ${control}`}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {format(parseISO(d), "EEE dd MMM")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={field}>
          <span className={fieldLabel}>From</span>
          <input
            type="time"
            aria-label="Start time"
            value={draft.start}
            onChange={(e) => e.target.value && edit({ start: e.target.value })}
            className={`cf-mono ${control}`}
            required
          />
        </div>
        <div className={field}>
          <span className={fieldLabel}>To</span>
          <input
            type="time"
            aria-label="End time"
            value={draft.end}
            onChange={(e) => e.target.value && edit({ end: e.target.value })}
            className={`cf-mono ${control}`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={field}>
          <span className={fieldLabel}>Location</span>
          <select
            aria-label="Location"
            value={draft.campusId}
            onChange={(e) => changeCampus(e.target.value)}
            className={`cf-mono ${control}`}
          >
            {campusOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className={field}>
          <span className={fieldLabel}>Room</span>
          <select
            aria-label="Room"
            value={draft.roomId}
            onChange={(e) => edit({ roomId: e.target.value })}
            className={`cf-mono ${control}`}
          >
            {roomOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={field}>
        <span className={fieldLabel}>Teaching</span>
        <input
          type="text"
          aria-label="Teaching"
          value={draft.curriculum}
          onChange={(e) => edit({ curriculum: e.target.value })}
          placeholder="Book, unit, pages — or just the skill"
          className={`${control} placeholder:text-ink-faint`}
          required
        />
      </div>

      <div className="flex items-center justify-between rounded bg-surface px-2 py-1.5">
        <span className="text-[11px] text-ink-mute">
          {endMin > startMin
            ? `${formatDuration(endMin - startMin)} × ${teacher?.code}'s rate`
            : "End must be after start"}
        </span>
        <MoneyPair usd={previewUsd} size="sm" align="right" />
      </div>

      {pending && (
        <div ref={warningRef} className="scroll-mb-20 space-y-1.5">
          {pending.conflicts
            .filter((c): c is TravelConflict => c.type === "travel")
            .map((c) => {
              const t = describeTravelConflict(c, pending.after, lookups);
              return (
                <div
                  key={travelGapKey(c)}
                  className="rounded border border-warn/30 bg-warn-soft px-2.5 py-2"
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-warn">
                    <span aria-hidden>⚠</span>
                    Tight travel gap
                  </div>
                  <dl className="mt-1.5 space-y-0.5 text-[12px]">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-mute">Available</dt>
                      <dd className="cf-mono text-ink">{t.availableLabel}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-mute">Recommended</dt>
                      <dd className="cf-mono text-ink">{t.recommendedLabel}</dd>
                    </div>
                  </dl>
                  <p className="mt-1 text-[12px] font-semibold text-warn">{t.shortLabel} short</p>
                  <p className="mt-1.5 cf-mono text-[12px] text-ink-mute">
                    {t.fromShort} {t.fromTime} → {t.toShort} {t.toTime}
                  </p>
                </div>
              );
            })}
          {pending.conflicts
            .filter((c): c is Exclude<Conflict, TravelConflict> => c.type !== "travel")
            .map((c) => {
              const warning = describeConflict(c, lesson.id, pending.after, lookups);
              return (
                <div
                  key={warning.key}
                  className="rounded border border-danger/25 bg-danger-soft px-2.5 py-2"
                >
                  <div className="flex items-start gap-1.5 text-[12px] font-semibold text-danger">
                    <span aria-hidden>⚠</span>
                    {warning.title}
                  </div>
                  {warning.lines.map((line) => (
                    <p key={line} className="ml-4 text-[12px] text-ink">
                      {line}
                    </p>
                  ))}
                </div>
              );
            })}
        </div>
      )}

      {/* Pinned: in a short window the fields scroll, the decision never leaves. */}
      <div className="sticky bottom-0 -mx-3 -mb-3 flex flex-wrap gap-1.5 border-t border-line bg-raised px-3 py-2">
        {pending ? (
          <>
            <button type="button" className={actionBtn} onClick={() => setPending(null)}>
              Go back and edit
            </button>
            <button
              type="submit"
              className={
                pendingHasHardConflict
                  ? `${actionBtn} border-danger/40 text-danger hover:border-danger`
                  : `${actionBtn} border-warn/40 text-warn hover:border-warn`
              }
            >
              Save anyway
            </button>
          </>
        ) : (
          <>
            <button
              type="submit"
              disabled={!valid}
              className="rounded bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-accent-ink disabled:opacity-40"
            >
              Save changes
            </button>
            <button type="button" className={actionBtn} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}
      </div>
    </form>
  );
}

/** Short campus label for a lesson, falling back to its id if the campus record is missing. */
function campusShortForLesson(
  lesson: Lesson | undefined,
  lookups: ReturnType<typeof useLookups>
): string {
  if (!lesson) return "?";
  const campus = lookups.campusOfRoom(lesson.roomId);
  if (campus) return campus.name;
  const campusId = lookups.roomsById.get(lesson.roomId)?.campusId;
  return campusId ? campusShortFromId(campusId) : "?";
}

/** The scannable facts of a tight-travel warning: what's available, what's needed, where. */
function describeTravelConflict(
  conflict: TravelConflict,
  after: Map<string, Lesson>,
  lookups: ReturnType<typeof useLookups>
): {
  fromShort: string;
  toShort: string;
  fromTime: string;
  toTime: string;
  availableLabel: string;
  recommendedLabel: string;
  shortLabel: string;
} {
  const [prev, next] = conflict.lessonIds.map((id) => after.get(id));
  return {
    fromShort: campusShortForLesson(prev, lookups),
    toShort: campusShortForLesson(next, lookups),
    fromTime: prev ? formatMin(prev.endMin) : "?",
    toTime: next ? formatMin(next.startMin) : "?",
    availableLabel: formatDuration(conflict.gapMin),
    recommendedLabel: formatDuration(MIN_TRAVEL_GAP_MINUTES),
    shortLabel: formatDuration(MIN_TRAVEL_GAP_MINUTES - conflict.gapMin),
  };
}

/** Plain-language consequence of one (non-travel) conflict the pending edit would create. */
function describeConflict(
  conflict: Exclude<Conflict, TravelConflict>,
  lessonId: string,
  after: Map<string, Lesson>,
  lookups: ReturnType<typeof useLookups>
): { key: string; title: string; lines: string[] } {
  const key = conflictKey(conflict);
  const describe = (l: Lesson | undefined) => {
    if (!l) return "another lesson";
    const code = lookups.classGroupsById.get(l.classGroupId)?.code ?? "another class";
    const campus = lookups.campusOfRoom(l.roomId)?.name;
    const room = lookups.roomsById.get(l.roomId)?.name;
    const where = [campus, room].filter(Boolean).join(" · ");
    return `${code} · ${formatRange(l.startMin, l.endMin)}${where ? ` · ${where}` : ""}`;
  };

  const otherId = conflict.lessonIds[0] === lessonId ? conflict.lessonIds[1] : conflict.lessonIds[0];
  const other = after.get(otherId);

  if (isTeacherOverlap(conflict)) {
    const edited = after.get(lessonId);
    const teacherCode = edited
      ? (lookups.teachersById.get(edited.teacherId)?.code ?? "this teacher")
      : "this teacher";
    return {
      key,
      title: `This change creates a double booking for ${teacherCode}.`,
      lines: [`Already teaching ${describe(other)}`],
    };
  }

  const edited = after.get(lessonId);
  const roomName = edited ? lookups.roomsById.get(edited.roomId)?.name : undefined;
  const campusName = edited ? lookups.campusOfRoom(edited.roomId)?.name : undefined;
  return {
    key,
    title: `Room ${roomName ?? "?"}${campusName ? ` at ${campusName}` : ""} is taken at that time.`,
    lines: [`Booked by ${describe(other)}`],
  };
}
