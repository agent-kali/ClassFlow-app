"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format, parseISO } from "date-fns";
import { useClassGroups, useLessonMutations, useLookups, useRooms, useTeachers, useToday } from "@/data/hooks";
import { lessonHours } from "@/domain/types";
import { formatMin, parseTime, weekDates } from "@/domain/time";
import { Combobox } from "@/components/Combobox";
import { MoneyPair } from "@/components/MoneyPair";

export interface CreatePrefill {
  date?: string;
  startMin?: number;
  endMin?: number;
}

interface Props {
  prefill: CreatePrefill;
  /** The week whose days the form offers; defaults to the current week. */
  weekOf?: string;
  onClose: () => void;
  onCreated?: () => void;
}

/**
 * One flat surface. Picking a class group implies the school, which narrows
 * rooms and shows the CM field only where that school actually has CMs.
 * The pay consequence is visible before the lesson is even saved.
 */
export function CreateLessonDialog({ prefill, weekOf, onClose, onCreated }: Props) {
  const today = useToday();
  const lookups = useLookups();
  const classGroups = useClassGroups();
  const rooms = useRooms();
  const teachers = useTeachers();
  const { createLesson } = useLessonMutations();

  const days = weekDates(parseISO(prefill.date ?? weekOf ?? today));
  const [classGroupId, setClassGroupId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [date, setDate] = useState(prefill.date ?? weekOf ?? today);
  const [start, setStart] = useState(formatMin(prefill.startMin ?? 9 * 60).padStart(5, "0"));
  const [end, setEnd] = useState(formatMin(prefill.endMin ?? 10 * 60).padStart(5, "0"));
  const [curriculum, setCurriculum] = useState("");
  const [cmName, setCmName] = useState("");
  const [weekCode, setWeekCode] = useState("");

  const group = classGroupId ? lookups.classGroupsById.get(classGroupId) : undefined;
  const school = group ? lookups.schoolsById.get(group.schoolId) : undefined;

  const groupOptions = useMemo(
    () =>
      classGroups.map((g) => ({
        id: g.id,
        label: g.code,
        hint: `${lookups.schoolsById.get(g.schoolId)?.shortName} · ${g.program}`,
      })),
    [classGroups, lookups]
  );

  const roomOptions = useMemo(() => {
    const eligible = group
      ? rooms.filter((r) => lookups.campusesById.get(r.campusId)?.schoolId === group.schoolId)
      : rooms;
    return eligible.map((r) => ({
      id: r.id,
      label: r.name,
      hint: `${lookups.campusesById.get(r.campusId)?.name}${group ? "" : ` · ${lookups.schoolOfRoom(r.id)?.shortName}`}`,
    }));
  }, [rooms, group, lookups]);

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ id: t.id, label: t.code, hint: `${t.name} · ${t.category}` })),
    [teachers]
  );

  const teacher = teacherId ? lookups.teachersById.get(teacherId) : undefined;
  const startMin = parseTime(start);
  const endMin = parseTime(end);
  const valid = classGroupId && roomId && teacherId && curriculum.trim() && endMin > startMin;
  const previewUsd = teacher && endMin > startMin ? lessonHours({ startMin, endMin }) * teacher.usdRate : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    createLesson({
      date,
      startMin,
      endMin,
      classGroupId: classGroupId!,
      roomId: roomId!,
      teacherId: teacherId!,
      curriculum: curriculum.trim(),
      cmName: cmName.trim() || undefined,
      weekCode: weekCode.trim() || undefined,
      status: "scheduled",
    });
    onCreated?.();
    onClose();
  };

  const field = "flex flex-col gap-1";
  const fieldLabel = "text-[11px] font-semibold uppercase tracking-wide text-ink-mute";
  const textInput =
    "w-full rounded border border-line bg-raised px-2 py-1.5 text-[13px] placeholder:text-ink-faint focus:border-accent focus:outline-none";

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-surface p-4"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <Dialog.Title className="text-[15px] font-semibold">New lesson</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-[12px] text-ink-mute">
            Pick the class first — it decides the school, the rooms, and whether a CM applies.
          </Dialog.Description>

          <form onSubmit={submit} className="mt-3 space-y-3">
            <div className={field}>
              <span className={fieldLabel}>Class</span>
              <Combobox
                options={groupOptions}
                value={classGroupId}
                onChange={(id) => {
                  setClassGroupId(id);
                  setRoomId(null);
                }}
                placeholder="Type a class code…"
                label="Class group"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={field}>
                <span className={fieldLabel}>Room {school ? `at ${school.shortName}` : ""}</span>
                <Combobox
                  options={roomOptions}
                  value={roomId}
                  onChange={setRoomId}
                  placeholder="Room…"
                  label="Room"
                />
              </div>
              <div className={field}>
                <span className={fieldLabel}>Teacher</span>
                <Combobox
                  options={teacherOptions}
                  value={teacherId}
                  onChange={setTeacherId}
                  placeholder="Initials…"
                  label="Teacher"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className={`${field} flex-1`}>
                <span className={fieldLabel}>Day</span>
                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Day"
                  className="cf-mono w-full rounded border border-line bg-raised px-1.5 py-1.5 text-[13px] focus:border-accent focus:outline-none"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {format(parseISO(d), "EEE dd/MM")}
                    </option>
                  ))}
                </select>
              </div>
              <div className={field}>
                <span className={fieldLabel}>From</span>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => e.target.value && setStart(e.target.value)}
                  aria-label="Start time"
                  className={`cf-mono ${textInput}`}
                  required
                />
              </div>
              <div className={field}>
                <span className={fieldLabel}>To</span>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => e.target.value && setEnd(e.target.value)}
                  aria-label="End time"
                  className={`cf-mono ${textInput}`}
                  required
                />
              </div>
            </div>

            <div className={field}>
              <span className={fieldLabel}>What they&apos;ll teach</span>
              <input
                type="text"
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                placeholder="Book, unit, pages — or just the skill"
                aria-label="Curriculum"
                className={textInput}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(!school || school.hasClassManagers) && (
                <div className={field}>
                  <span className={fieldLabel}>Class manager</span>
                  <input
                    type="text"
                    value={cmName}
                    onChange={(e) => setCmName(e.target.value)}
                    placeholder="Optional"
                    aria-label="Class manager"
                    className={textInput}
                  />
                </div>
              )}
              <div className={field}>
                <span className={fieldLabel}>Week code</span>
                <input
                  type="text"
                  value={weekCode}
                  onChange={(e) => setWeekCode(e.target.value)}
                  placeholder="W6D1, D7…"
                  aria-label="Week code"
                  className={`cf-mono ${textInput}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded bg-accent-soft/60 px-2.5 py-2">
              <span className="text-[11px] text-ink-mute">
                {teacher ? `Adds to ${teacher.code}'s pay` : "Pick a teacher to see the pay"}
              </span>
              <MoneyPair usd={previewUsd} size="sm" align="right" />
            </div>

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded border border-line px-3 py-1.5 text-[13px] font-medium hover:border-ink-faint"
                >
                  Discard
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!valid}
                className="rounded bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
              >
                Add to schedule
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
