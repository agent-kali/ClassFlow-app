"use client";

import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { TopBar } from "@/components/TopBar";
import { ClientOnly } from "@/components/ClientOnly";
import { useConflicts, useLessons, useLookups, useToday } from "@/data/hooks";
import type { Lesson } from "@/domain/types";
import { mondayOf, snapMin, toIsoDate, weekDates } from "@/domain/time";
import { WeekTimeline } from "@/features/manager/WeekTimeline";
import { FilterRail } from "@/features/manager/FilterRail";
import { useFilteredLessons, useScheduleFilters } from "@/features/manager/filters";
import { LessonPopover } from "@/features/manager/LessonPopover";
import { CreateLessonDialog, type CreatePrefill } from "@/features/manager/CreateLessonDialog";
import { ImportDialog } from "@/features/manager/ImportDialog";
import { PayStrip } from "@/features/manager/PayStrip";

export default function ManagerPage() {
  return (
    <ClientOnly>
      <ManagerScreen />
    </ClientOnly>
  );
}

interface Selection {
  lesson: Lesson;
  rect: DOMRect;
}

function ManagerScreen() {
  const lessons = useLessons();
  const today = useToday();
  const lookups = useLookups();
  const { conflicts, byLesson } = useConflicts();
  const { filters, toggle, clear, isActive } = useScheduleFilters();
  const filtered = useFilteredLessons(lessons, filters, lookups);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [createPrefill, setCreatePrefill] = useState<CreatePrefill | null>(null);
  const [importing, setImporting] = useState(false);
  const [anchorDate, setAnchorDate] = useState(today);
  const [railOpen, setRailOpen] = useState(false);

  const days = useMemo(() => weekDates(parseISO(anchorDate)), [anchorDate]);
  const weekLabel = `${format(parseISO(days[0]), "d MMM")} – ${format(parseISO(days[6]), "d MMM yyyy")}`;
  const isCurrentWeek = days.includes(today);
  const shiftWeek = (weeks: number) =>
    setAnchorDate(toIsoDate(addDays(mondayOf(parseISO(anchorDate)), weeks * 7)));

  const overlapCount = conflicts.filter((c) => c.type === "overlap").length;
  const travelCount = conflicts.filter((c) => c.type === "travel").length;

  // The popover reads the live lesson so edits reflect immediately.
  const selectedLesson = selection
    ? lessons.find((l) => l.id === selection.lesson.id) ?? null
    : null;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />

      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
            className="rounded border border-line px-1.5 py-0.5 text-[12px] text-ink-mute hover:border-ink-faint hover:text-ink"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
            className="rounded border border-line px-1.5 py-0.5 text-[12px] text-ink-mute hover:border-ink-faint hover:text-ink"
          >
            &rarr;
          </button>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => setAnchorDate(today)}
              className="rounded border border-line px-1.5 py-0.5 text-[11px] text-accent hover:border-accent"
            >
              This week
            </button>
          )}
        </div>
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
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            className="rounded border border-line px-2.5 py-1 text-[12px] font-medium hover:border-ink-faint md:hidden"
          >
            Filters
          </button>
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="rounded border border-line px-2.5 py-1 text-[12px] font-medium transition-colors hover:border-ink-faint"
          >
            Import a schedule
          </button>
          <button
            type="button"
            onClick={() => setCreatePrefill({})}
            className="rounded bg-accent px-2.5 py-1 text-[12px] font-semibold text-accent-ink transition-opacity hover:opacity-90"
          >
            New lesson
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <FilterRail
          filters={filters}
          toggle={toggle}
          clear={clear}
          isActive={isActive}
          mobileOpen={railOpen}
          onMobileClose={() => setRailOpen(false)}
        />
        <WeekTimeline
          lessons={filtered}
          allLessons={lessons}
          anchorDate={anchorDate}
          today={today}
          lookups={lookups}
          conflictsByLesson={byLesson}
          selectedLessonId={selectedLesson?.id ?? null}
          onSelectLesson={(lesson, el) =>
            setSelection({ lesson, rect: el.getBoundingClientRect() })
          }
          onCreateRange={(date, startMin, endMin) =>
            setCreatePrefill({ date, startMin, endMin })
          }
          snap={snapMin}
        />
      </div>

      <PayStrip anchorDate={anchorDate} />

      {selectedLesson && selection && (
        <LessonPopover
          lesson={selectedLesson}
          anchorRect={selection.rect}
          weekOf={anchorDate}
          onClose={() => setSelection(null)}
        />
      )}
      {createPrefill && (
        <CreateLessonDialog
          prefill={createPrefill}
          weekOf={anchorDate}
          onClose={() => setCreatePrefill(null)}
        />
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </div>
  );
}
