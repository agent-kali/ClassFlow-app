"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { TopBar } from "@/components/TopBar";
import { useLocale } from "@/features/landing/locale";
import { managerDateLocale } from "@/features/manager/dateLocale";
import { ClientOnly } from "@/components/ClientOnly";
import {
  useConflicts,
  useLastPayEffect,
  useLessons,
  useLookups,
  useTeachers,
  useToday,
} from "@/data/hooks";
import type { Lesson } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { mondayOf, toIsoDate, weekDates } from "@/domain/time";
import { useLessonMutations } from "@/data/hooks";
import { WeekTimeline } from "@/features/manager/WeekTimeline";
import { DayTimeline } from "@/features/manager/DayTimeline";
import { DayDateStrip } from "@/features/manager/DayDateStrip";
import { ScheduleToolbar } from "@/features/manager/ScheduleToolbar";
import { useIsNarrow } from "@/features/manager/useIsNarrow";
import {
  buildDayIssueMarkers,
  resolveInitialDayDate,
  resolveIssueNavigation,
  shiftDay,
  type ScheduleViewMode,
} from "@/features/manager/dayViewState";
import { travelGapKey, type TravelConflict } from "@/features/manager/travelGap";
import {
  earlierLessonId,
  overlapKey,
  type TeacherOverlap,
} from "@/features/manager/overlap";
import { isTeacherOverlap } from "@/domain/conflicts";
import { FilterRail } from "@/features/manager/FilterRail";
import { useFilteredLessons, useScheduleFilters } from "@/features/manager/filters";
import { LessonPopover } from "@/features/manager/LessonPopover";
import { CreateLessonDialog, type CreatePrefill } from "@/features/manager/CreateLessonDialog";
import { ImportDialog } from "@/features/manager/ImportDialog";
import { PayStrip } from "@/features/manager/PayStrip";
import { ManagerTour } from "@/features/tour/ManagerTour";
import { resolveTourLessonLock } from "@/features/tour/lessonLock";
import { resolveTourLessonId } from "@/features/tour/tourLesson";
import { useTourActive } from "@/features/tour/useTourActive";

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
  const [locale] = useLocale();
  const dateLocale = managerDateLocale(locale);
  const lessons = useLessons();
  const today = useToday();
  const lookups = useLookups();
  const teachers = useTeachers();
  const { conflicts, byLesson } = useConflicts();
  const { filters, toggle, setTeacherIds, ensureIncluded, clear, isActive } =
    useScheduleFilters();
  const filtered = useFilteredLessons(lessons, filters, lookups);
  const payEffect = useLastPayEffect();
  const { rescheduleLesson } = useLessonMutations();

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
  const [travelCycle, setTravelCycle] = useState<{
    signature: string;
    cursor: number | null;
  }>({ signature: "", cursor: null });
  const [travelFocusNonce, setTravelFocusNonce] = useState(0);
  /** Index into overlapConflicts while cycling from the header pill; null until first click. */
  const [overlapCursorState, setOverlapCursorState] = useState<{
    signature: string;
    index: number | null;
  }>({ signature: "", index: null });
  const [overlapFocusState, setOverlapFocusState] = useState<{
    signature: string;
    key: string;
    selectId: string;
    nonce: number;
  } | null>(null);
  /** Set while jumping between a conflict pair so dismissing the old popover doesn't clear the highlight. */
  const pendingConflictSelectRef = useRef<string | null>(null);
  const tourSessionClearedRef = useRef(false);
  const [tourStep, setTourStep] = useState(0);
  const tourActive = useTourActive();

  const [viewMode, setViewMode] = useState<ScheduleViewMode>("week");
  const [dayDate, setDayDate] = useState(today);
  /** The lesson pair a conflict jump put under the manager's eye, and the day it lives on. */
  const [dayFocus, setDayFocus] = useState<{
    date: string;
    lessonIds: string[];
    nonce: number;
  } | null>(null);
  const isNarrow = useIsNarrow();

  const days = useMemo(() => weekDates(parseISO(anchorDate)), [anchorDate]);
  const tourLessonId = useMemo(
    () =>
      resolveTourLessonId(filtered, days, (id) => lookups.classGroupsById.get(id)?.code),
    [filtered, days, lookups]
  );
  const tourLessonLock = resolveTourLessonLock(tourActive, tourStep, tourLessonId);

  useEffect(() => {
    if (!tourActive) tourSessionClearedRef.current = false;
  }, [tourActive]);

  const handleTourStepChange = useCallback((step: number) => {
    if (!tourSessionClearedRef.current) {
      tourSessionClearedRef.current = true;
      setSelection(null);
      setOverlapFocusState(null);
    }
    setTourStep(step);
  }, [setOverlapFocusState, setSelection, setTourStep]);

  const weekLabel = `${format(parseISO(days[0]), "d MMM", { locale: dateLocale })} – ${format(parseISO(days[6]), "d MMM yyyy", { locale: dateLocale })}`;
  const weekLabelCompact = `${format(parseISO(days[0]), "d")}–${format(parseISO(days[6]), "d MMM yyyy", { locale: dateLocale })}`;
  const isCurrentWeek = days.includes(today);
  const shiftWeek = (weeks: number) =>
    setAnchorDate(toIsoDate(addDays(mondayOf(parseISO(anchorDate)), weeks * 7)));

  // The spatial timeline is a desktop instrument, and the guided tour walks
  // the week agenda — either one keeps the schedule in Week View.
  const canUseDayView = !isNarrow && !tourActive;
  const mode: ScheduleViewMode = canUseDayView ? viewMode : "week";
  const dayLabel = format(parseISO(dayDate), "EEE d MMM yyyy", { locale: dateLocale });
  const dayLabelCompact = format(parseISO(dayDate), "EEE d MMM", { locale: dateLocale });
  /** Focus belongs to the day it was set on, so changing date drops it. */
  const activeDayFocus = dayFocus && dayFocus.date === dayDate ? dayFocus : null;

  /** Keeps the anchored week — and so the pay strip — around the open day. */
  const goToDay = (date: string) => {
    setDayDate(date);
    if (!days.includes(date)) setAnchorDate(date);
  };

  const stepBack = () => (mode === "day" ? goToDay(shiftDay(dayDate, -1)) : shiftWeek(-1));
  const stepForward = () => (mode === "day" ? goToDay(shiftDay(dayDate, 1)) : shiftWeek(1));
  const atNow = mode === "day" ? dayDate === today : isCurrentWeek;
  const goToNow = () => (mode === "day" ? goToDay(today) : setAnchorDate(today));

  const changeMode = (next: ScheduleViewMode) => {
    if (next === viewMode) return;
    if (next === "day") {
      setDayDate(
        resolveInitialDayDate({
          highlightedDate: selection?.lesson.date ?? null,
          today,
          weekDays: days,
        })
      );
    }
    setViewMode(next);
  };

  /** Rows are every selected teacher — an empty row still says "available". */
  const dayTeacherIds = useMemo(() => {
    const ordered = [...teachers].sort((a, b) => a.code.localeCompare(b.code));
    const selected = filters.teacherIds;
    return (selected.size > 0 ? ordered.filter((t) => selected.has(t.id)) : ordered).map(
      (t) => t.id
    );
  }, [teachers, filters.teacherIds]);

  const dayMarkers = useMemo(
    () => buildDayIssueMarkers(days, filtered, conflicts),
    [days, filtered, conflicts]
  );

  const overlapConflicts = useMemo(() => {
    const daySet = new Set(days);
    return conflicts.filter((c): c is TeacherOverlap => {
      if (!isTeacherOverlap(c)) return false;
      const a = lessons.find((l) => l.id === c.lessonIds[0]);
      return !!a && daySet.has(a.date);
    });
  }, [conflicts, lessons, days]);
  const overlapCount = overlapConflicts.length;
  const overlapKeys = useMemo(
    () => overlapConflicts.map(overlapKey).join(","),
    [overlapConflicts]
  );
  const overlapSignature = `${anchorDate}:${overlapKeys}`;
  const overlapCursor =
    overlapCursorState.signature === overlapSignature ? overlapCursorState.index : null;
  const overlapFocus =
    overlapFocusState?.signature === overlapSignature ? overlapFocusState : null;
  const lessonsById = useMemo(
    () => new Map(lessons.map((l) => [l.id, l])),
    [lessons]
  );

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
  const travelSignature = `${anchorDate}:${travelKeys}`;
  const travelCursor =
    travelCycle.signature === travelSignature ? travelCycle.cursor : null;
  const focusedTravelKey =
    travelCursor !== null && travelConflicts[travelCursor]
      ? travelGapKey(travelConflicts[travelCursor])
      : null;

  /**
   * The single route behind every "show me this problem" control: open Day
   * View on the issue's date, make its teacher visible without discarding the
   * manager's other filters, and leave a static ring on both lessons. On a
   * phone, and during the tour, the week agenda keeps its own behaviour.
   */
  const navigateToIssue = (lessonIds: readonly string[]) => {
    if (!canUseDayView) return false;
    const pair = lessonIds
      .map((id) => lessonsById.get(id))
      .filter((l): l is Lesson => !!l);
    const nav = resolveIssueNavigation(pair, filters, (lesson) => {
      const campus = lookups.campusOfRoom(lesson.roomId);
      return { campusId: campus?.id, schoolId: campus?.schoolId };
    });
    if (!nav) return false;

    ensureIncluded("teacherIds", nav.widen.teacherIds);
    ensureIncluded("campusIds", nav.widen.campusIds);
    ensureIncluded("schoolIds", nav.widen.schoolIds);
    setSelection(null);
    setOverlapFocusState(null);
    setViewMode("day");
    goToDay(nav.date);
    setDayFocus({
      date: nav.date,
      lessonIds: nav.focusLessonIds,
      nonce: (dayFocus?.nonce ?? 0) + 1,
    });
    return true;
  };

  const focusTravelAt = (index: number) => {
    if (travelCount === 0) return;
    const next = ((index % travelCount) + travelCount) % travelCount;
    setTravelCycle({ signature: travelSignature, cursor: next });
    if (navigateToIssue(travelConflicts[next].lessonIds)) return;
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

  const focusOverlap = (conflict: TeacherOverlap, selectId: string) => {
    const idx = overlapConflicts.findIndex((c) => overlapKey(c) === overlapKey(conflict));
    if (idx >= 0) setOverlapCursorState({ signature: overlapSignature, index: idx });
    pendingConflictSelectRef.current = selectId;
    setSelection(null);
    setOverlapFocusState({
      signature: overlapSignature,
      key: overlapKey(conflict),
      selectId,
      nonce: (overlapFocus?.nonce ?? 0) + 1,
    });
  };

  const cycleOverlap = () => {
    if (overlapCount === 0) return;
    const next = overlapCursor === null ? 0 : (overlapCursor + 1) % overlapCount;
    const conflict = overlapConflicts[next];
    setOverlapCursorState({ signature: overlapSignature, index: next });
    if (navigateToIssue(conflict.lessonIds)) return;
    focusOverlap(conflict, earlierLessonId(conflict, lessonsById));
  };

  const handleConflictFocused = (lessonId: string, el: HTMLElement | null) => {
    pendingConflictSelectRef.current = null;
    const lesson = lessonsById.get(lessonId);
    if (!lesson) return;
    const rect = el?.getBoundingClientRect();
    setSelection({
      lesson,
      rect:
        rect && rect.width > 0
          ? rect
          : new DOMRect(Math.max(24, window.innerWidth / 2 - 40), 140, 80, 72),
    });
  };

  const dismissLessonDetails = () => {
    setSelection(null);
    if (!pendingConflictSelectRef.current) setOverlapFocusState(null);
  };

  const selectLesson = (lesson: Lesson, el: HTMLElement) => {
    pendingConflictSelectRef.current = null;
    const related = overlapFocus && overlapFocus.key.split("|").includes(lesson.id);
    if (!related) setOverlapFocusState(null);
    // Picking a lesson outside the focused pair is how the manager moves on.
    if (dayFocus && !dayFocus.lessonIds.includes(lesson.id)) setDayFocus(null);
    setSelection({ lesson, rect: el.getBoundingClientRect() });
  };

  const viewConflictingLesson = (otherId: string) => {
    const currentId = selectedLesson?.id;
    if (!currentId) return;
    if (navigateToIssue([currentId, otherId])) return;
    const conflict = overlapConflicts.find(
      (c) =>
        (c.lessonIds[0] === currentId && c.lessonIds[1] === otherId) ||
        (c.lessonIds[1] === currentId && c.lessonIds[0] === otherId)
    ) ?? {
      type: "overlap" as const,
      kind: "teacher" as const,
      lessonIds: [currentId, otherId] as [string, string],
    };
    focusOverlap(conflict, otherId);
  };

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
    <div className="flex h-dvh min-w-0 flex-col overflow-x-hidden">
      <TopBar />

      <ScheduleToolbar
        mode={mode}
        titleFull={mode === "day" ? dayLabel : weekLabel}
        titleCompact={mode === "day" ? dayLabelCompact : weekLabelCompact}
        canUseDayView={canUseDayView}
        onChangeMode={changeMode}
        onStepBack={stepBack}
        onStepForward={stepForward}
        onGoToNow={goToNow}
        atNow={atNow}
        overlapCount={overlapCount}
        overlapCursor={overlapCursor}
        onCycleOverlap={cycleOverlap}
        travelCount={travelCount}
        travelCursor={travelCursor}
        onCycleTravelGap={cycleTravelGap}
        showClearFocus={mode === "day" && !!activeDayFocus}
        onClearFocus={() => setDayFocus(null)}
        onOpenFilters={() => setRailOpen(true)}
        onOpenImport={() => setImporting(true)}
        onNewLesson={() => setCreatePrefill({})}
      />

      <div className="flex min-h-0 min-w-0 flex-1">
        <FilterRail
          filters={filters}
          toggle={toggle}
          setTeacherIds={setTeacherIds}
          clear={clear}
          isActive={isActive}
          mobileOpen={railOpen}
          onMobileClose={() => setRailOpen(false)}
        />
        {mode === "day" ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
            <DayDateStrip
              markers={dayMarkers}
              selected={dayDate}
              today={today}
              onSelect={goToDay}
            />
            <DayTimeline
              lessons={filtered}
              date={dayDate}
              today={today}
              teacherIds={dayTeacherIds}
              lookups={lookups}
              conflictsByLesson={byLesson}
              travelConflicts={travelConflicts}
              focusedLessonIds={activeDayFocus?.lessonIds ?? null}
              focusNonce={activeDayFocus?.nonce ?? 0}
              selectedLessonId={selectedLesson?.id ?? null}
              onSelectLesson={selectLesson}
              onMoveLesson={(id, date, startMin, endMin) =>
                rescheduleLesson(id, date, startMin, endMin)
              }
            />
          </div>
        ) : (
          <WeekTimeline
            lessons={filtered}
            anchorDate={anchorDate}
            today={today}
            lookups={lookups}
            conflictsByLesson={byLesson}
            travelConflicts={travelConflicts}
            focusedTravelKey={focusedTravelKey}
            travelFocusNonce={travelFocusNonce}
            onFocusTravelGap={focusTravelByKey}
            focusedOverlapKey={overlapFocus?.key ?? null}
            overlapFocusNonce={overlapFocus?.nonce ?? 0}
            focusLessonId={overlapFocus?.selectId ?? null}
            onConflictFocused={handleConflictFocused}
            selectedLessonId={selectedLesson?.id ?? null}
            lockLessonSelection={tourLessonLock}
            onSelectLesson={selectLesson}
            onMoveLesson={
              tourActive
                ? undefined
                : (id, date, startMin, endMin) => rescheduleLesson(id, date, startMin, endMin)
            }
          />
        )}
      </div>

      <PayStrip anchorDate={anchorDate} />

      {selectedLesson && selection && (
        <LessonPopover
          key={selectedLesson.id}
          lesson={selectedLesson}
          anchorRect={selection.rect}
          weekOf={anchorDate}
          stackAboveTour={tourActive}
          onClose={dismissLessonDetails}
          onViewConflictingLesson={viewConflictingLesson}
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
      {importing && (
        <ImportDialog stackAboveTour={tourActive} onClose={() => setImporting(false)} />
      )}
      <ManagerTour
        onOpenImport={() => setImporting(true)}
        onStepChange={handleTourStepChange}
      />
    </div>
  );
}
