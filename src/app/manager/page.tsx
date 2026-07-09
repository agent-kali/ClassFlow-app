"use client";

import { TopBar } from "@/components/TopBar";
import { SchoolChip } from "@/components/SchoolChip";
import { useLessons, useLookups, useToday } from "@/data/hooks";
import { formatRange, weekDates } from "@/domain/time";
import { format, parseISO } from "date-fns";

/** Increment 1 placeholder: proves the data layer end to end. Replaced by the week timeline. */
export default function ManagerPage() {
  const lessons = useLessons();
  const today = useToday();
  const { classGroupsById, roomsById, teachersById, schoolOfRoom, campusOfRoom } = useLookups();
  const days = weekDates(parseISO(today));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <h1 className="mb-4 text-lg font-semibold">This week</h1>
        {days.map((date) => {
          const dayLessons = lessons
            .filter((l) => l.date === date)
            .sort((a, b) => a.startMin - b.startMin);
          if (dayLessons.length === 0) return null;
          return (
            <section key={date} className="mb-6">
              <h2 className="cf-mono mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">
                {format(parseISO(date), "EEE dd/MM")}
                {date === today && <span className="ml-2 text-accent">today</span>}
              </h2>
              <ul className="divide-y divide-line-soft rounded border border-line bg-surface">
                {dayLessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="cf-mono w-28 shrink-0 text-ink-mute">
                      {formatRange(l.startMin, l.endMin)}
                    </span>
                    <SchoolChip school={schoolOfRoom(l.roomId)} />
                    <span className="cf-mono font-semibold">{classGroupsById.get(l.classGroupId)?.code}</span>
                    <span className="text-ink-mute">
                      {roomsById.get(l.roomId)?.name} · {campusOfRoom(l.roomId)?.name}
                    </span>
                    <span className="cf-mono ml-auto">{teachersById.get(l.teacherId)?.code}</span>
                    {l.status !== "scheduled" && (
                      <span className="cf-mono text-xs uppercase text-danger">{l.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}
