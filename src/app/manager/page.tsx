"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Badge, badgeClassName } from "@/components/Badge";
import { TopBar } from "@/components/TopBar";
import { ClientOnly } from "@/components/ClientOnly";
import { useConflicts, useLastPayEffect, useLessons, useLookups, useToday } from "@/data/hooks";
import type { Lesson } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { mondayOf, snapMin, toIsoDate, weekDates } from "@/domain/time";
import { WeekTimeline } from "@/features/manager/WeekTimeline";
import { travelGapKey, type TravelConflict } from "@/features/manager/travelGap";
import { FilterRail } from "@/features/manager/FilterRail";
import { useFilteredLessons, useScheduleFilters } from "@/features/manager/filters";
import { LessonPopover } from "@/features/manager/LessonPopover";
import { CreateLessonDialog, type CreatePrefill } from "@/features/manager/CreateLessonDialog";
import { ImportDialog } from "@/features/manager/ImportDialog";
import { PayStrip } from "@/features/manager/PayStrip";
import { ManagerTour } from "@/features/tour/ManagerTour";

export default function ManagerPage() {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <ManagerScreen />
      </Suspense>
    </ClientOnly>
  );
}

interface Selection {
  lesson: Lesson;
  rect: DOMRect;
}

/** A pay delta rendered right where the edit happened, then it drifts away. */
interface EditFlash {
  key: number;
  top: number;
  left: number;
  deltaUsd: number;
}

function ManagerScreen() {
  const lessons = useLessons();
  const today = useToday();
  const lookups = useLookups();
  const { conflicts, byLesson } = useConflicts();
  const { filters, toggle, clear, isActive } = useScheduleFilters();
  const filtered = useFilteredLessons(lessons, filters, lookups);
  const payEffect = useLastPayEffect();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [editFlash, setEditFlash] = useState<EditFlash | null>(null);
  // The lesson block's rect, captured the instant a pay-affecting edit fires.
  const pendingEditRect = useRef<DOMRect | null>(null);
  const flashedEffectId = useRef(0);
  const [createPrefill, setCreatePrefill] = useState<CreatePrefill | null>(null);
  const [importing, setImporting] = useState(false);
  const [anchorDate, setAnchorDate] = useState(today);
  const [railOpen, setRailOpen] = useState(false);
  /** Index into travelConflicts while cycling from the header pill; null until first click. */
  const [travelCursor, setTravelCursor] = useState<number | null>(null);
  const [travelFocusNonce, setTravelFocusNonce] = useState(0);

  const days = useMemo(() => weekDates(parseISO(anchorDate)), [anchorDate]);
  const weekLabel = `${format(parseISO(days[0]), "d MMM")} – ${format(parseISO(days[6]), "d MMM yyyy")}`;
  const isCurrentWeek = days.includes(today);
  const shiftWeek = (weeks: number) =>
    setAnchorDate(toIsoDate(addDays(mondayOf(parseISO(anchorDate)), weeks * 7)));

  const overlapCount = conflicts.filter((c) => {
    if (c.type !== "overlap") return false;
    const a = lessons.find((l) => l.id === c.lessonIds[0]);
    return a ? days.includes(a.date) : false;
  }).length;

  const travelConflicts = useMemo(() => {
    const daySet = new Set(days);
    return conflicts.filter((c): c is TravelConflict => {
      if (c.type !== "travel") return false;
      const a = lessons.find((l) => l.id === c.lessonIds[0]);
      return !!a && daySet.has(a.date);
    });
  }, [conflicts, lessons, days]);
  const travelCount = travelConflicts.length;
  const travelKeys = useMemo(
    () => travelConflicts.map(travelGapKey).join(","),
    [travelConflicts]
  );
  const focusedTravelKey =
    travelCursor !== null && travelConflicts[travelCursor]
      ? travelGapKey(travelConflicts[travelCursor])
      : null;

  // Reset cycle when the set of travel gaps changes (edit / filter / week shift).
  useEffect(() => {
    setTravelCursor(null);
  }, [travelKeys, anchorDate]);

  const focusTravelAt = (index: number) => {
    if (travelCount === 0) return;
    setTravelCursor(((index % travelCount) + travelCount) % travelCount);
    setTravelFocusNonce((n) => n + 1);
  };

  const cycleTravelGap = () => {
    if (travelCount === 0) return;
    focusTravelAt(travelCursor === null ? 0 : travelCursor + 1);
  };

  const focusTravelByKey = (key: string) => {
    const idx = travelConflicts.findIndex((c) => travelGapKey(c) === key);
    if (idx >= 0) focusTravelAt(idx);
  };

  // The popover reads the live lesson so edits reflect immediately.
  const selectedLesson = selection
    ? lessons.find((l) => l.id === selection.lesson.id) ?? null
    : null;

  // When an edit from the popover changes pay, float the delta at the block
  // the manager just acted on — the consequence lands where the eye already is.
  useEffect(() => {
    if (!payEffect || payEffect.id === flashedEffectId.current) return;
    flashedEffectId.current = payEffect.id;
    const rect = pendingEditRect.current;
    pendingEditRect.current = null;
    if (!rect) return;
    setEditFlash({
      key: payEffect.id,
      top: rect.top,
      left: rect.left + rect.width / 2,
      deltaUsd: payEffect.deltaUsd,
    });
  }, [payEffect]);

  useEffect(() => {
    if (!editFlash) return;
    const t = setTimeout(() => setEditFlash(null), 2400);
    return () => clearTimeout(t);
  }, [editFlash]);

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
            <Badge size="md" tone="count" countKind="danger">
              {overlapCount} double-booking{overlapCount > 1 ? "s" : ""}
            </Badge>
          )}
          {travelCount > 0 && (
            <button
              type="button"
              onClick={cycleTravelGap}
              className={badgeClassName({
                size: "md",
                tone: "count",
                countKind: "warn",
                className:
                  "transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              })}
              aria-label={
                travelCount === 1
                  ? "Show tight travel gap on the schedule"
                  : travelCursor === null
                    ? `Show first of ${travelCount} tight travel gaps`
                    : `Show next tight travel gap, currently ${travelCursor + 1} of ${travelCount}`
              }
            >
              {travelCount} tight travel gap{travelCount > 1 ? "s" : ""}
              {travelCursor !== null && travelCount > 1
                ? ` · ${travelCursor + 1}/${travelCount}`
                : ""}
            </button>
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
            data-tour="import"
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
          travelConflicts={travelConflicts}
          focusedTravelKey={focusedTravelKey}
          travelFocusNonce={travelFocusNonce}
          onFocusTravelGap={focusTravelByKey}
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
          onAction={() => {
            pendingEditRect.current = selection.rect;
          }}
        />
      )}
      {editFlash && (
        <div
          key={editFlash.key}
          className="cf-delta-rise pointer-events-none fixed z-60"
          style={{ top: editFlash.top - 8, left: editFlash.left }}
        >
          <span
            className="cf-mono -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2 py-1 text-[15px] font-bold"
            style={{
              display: "inline-block",
              background: editFlash.deltaUsd < 0 ? "var(--danger-soft)" : "var(--accent-soft)",
              color: editFlash.deltaUsd < 0 ? "var(--danger)" : "var(--accent)",
              boxShadow: "var(--shadow-pop)",
            }}
          >
            {editFlash.deltaUsd < 0 ? "−" : "+"}
            {formatUsd(Math.abs(editFlash.deltaUsd))}
          </span>
        </div>
      )}
      {createPrefill && (
        <CreateLessonDialog
          prefill={createPrefill}
          weekOf={anchorDate}
          onClose={() => setCreatePrefill(null)}
        />
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
      <ManagerTour onOpenImport={() => setImporting(true)} />
    </div>
  );
}
