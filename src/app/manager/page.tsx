"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { TopBar } from "@/components/TopBar";
import { ClientOnly } from "@/components/ClientOnly";
import { useConflicts, useLessons, useLookups, useToday } from "@/data/hooks";
import { weekDates } from "@/domain/time";
import { WeekTimeline } from "@/features/manager/WeekTimeline";
import { FilterRail } from "@/features/manager/FilterRail";
import { useFilteredLessons, useScheduleFilters } from "@/features/manager/filters";

export default function ManagerPage() {
  return (
    <ClientOnly>
      <ManagerScreen />
    </ClientOnly>
  );
}

function ManagerScreen() {
  const lessons = useLessons();
  const today = useToday();
  const lookups = useLookups();
  const { conflicts, byLesson } = useConflicts();
  const { filters, toggle, clear, isActive } = useScheduleFilters();
  const filtered = useFilteredLessons(lessons, filters, lookups);

  const days = useMemo(() => weekDates(parseISO(today)), [today]);
  const weekLabel = `${format(parseISO(days[0]), "d MMM")} – ${format(parseISO(days[6]), "d MMM yyyy")}`;

  const overlapCount = conflicts.filter((c) => c.type === "overlap").length;
  const travelCount = conflicts.filter((c) => c.type === "travel").length;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />

      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-1.5">
        <h1 className="cf-mono text-[13px] font-semibold">{weekLabel}</h1>
        <div className="flex items-center gap-1.5">
          {overlapCount > 0 && (
            <span
              className="cf-mono rounded-sm px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {overlapCount} double-booking{overlapCount > 1 ? "s" : ""}
            </span>
          )}
          {travelCount > 0 && (
            <span
              className="cf-mono rounded-sm px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
            >
              {travelCount} tight travel gap{travelCount > 1 ? "s" : ""}
            </span>
          )}
          {overlapCount === 0 && travelCount === 0 && (
            <span className="cf-mono text-[11px] text-ink-faint">No conflicts</span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <FilterRail filters={filters} toggle={toggle} clear={clear} isActive={isActive} />
        <WeekTimeline
          lessons={filtered}
          allLessons={lessons}
          today={today}
          lookups={lookups}
          conflictsByLesson={byLesson}
        />
      </div>
    </div>
  );
}
