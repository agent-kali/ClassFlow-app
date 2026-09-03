"use client";

import { badgeClassName } from "@/components/Badge";
import { useLocale } from "@/features/landing/locale";
import { getManagerCopy } from "./copy";
import { ScheduleViewToggle } from "./ScheduleViewToggle";
import type { ScheduleViewMode } from "./dayViewState";

interface Props {
  mode: ScheduleViewMode;
  titleFull: string;
  titleCompact: string;
  canUseDayView: boolean;
  onChangeMode: (mode: ScheduleViewMode) => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onGoToNow: () => void;
  atNow: boolean;
  overlapCount: number;
  overlapCursor: number | null;
  onCycleOverlap: () => void;
  travelCount: number;
  travelCursor: number | null;
  onCycleTravelGap: () => void;
  showClearFocus: boolean;
  onClearFocus: () => void;
  onOpenFilters: () => void;
  onOpenImport: () => void;
  onNewLesson: () => void;
}

/**
 * The schedule header below TopBar. Below xl it stacks into deliberate rows so
 * narrow widths never compress a single desktop row; at xl+ it reads as one line.
 */
export function ScheduleToolbar({
  mode,
  titleFull,
  titleCompact,
  canUseDayView,
  onChangeMode,
  onStepBack,
  onStepForward,
  onGoToNow,
  atNow,
  overlapCount,
  overlapCursor,
  onCycleOverlap,
  travelCount,
  travelCursor,
  onCycleTravelGap,
  showClearFocus,
  onClearFocus,
  onOpenFilters,
  onOpenImport,
  onNewLesson,
}: Props) {
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);
  const stepBackLabel = mode === "day" ? copy.previousDay : copy.previousWeek;
  const stepForwardLabel = mode === "day" ? copy.nextDay : copy.nextWeek;
  const nowLabel = mode === "day" ? copy.today : copy.thisWeek;

  return (
    <div className="schedule-toolbar">
      <div className="schedule-toolbar__nav-row">
        <div className="schedule-toolbar__nav">
          <button
            type="button"
            onClick={onStepBack}
            aria-label={stepBackLabel}
            className="schedule-toolbar__arrow"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={onStepForward}
            aria-label={stepForwardLabel}
            className="schedule-toolbar__arrow"
          >
            &rarr;
          </button>
          {!atNow && (
            <button type="button" onClick={onGoToNow} className="schedule-toolbar__now">
              {nowLabel}
            </button>
          )}
        </div>
        <h1 className="schedule-toolbar__title cf-mono">
          <span className="schedule-toolbar__title-full">{titleFull}</span>
          <span className="schedule-toolbar__title-compact">{titleCompact}</span>
        </h1>
        {canUseDayView && (
          <ScheduleViewToggle mode={mode} onChange={onChangeMode} />
        )}
      </div>

      <div className="schedule-toolbar__status-row">
        {overlapCount > 0 && (
          <button
            type="button"
            onClick={onCycleOverlap}
            className={badgeClassName({
              size: "md",
              tone: "count",
              countKind: "danger",
              className:
                "schedule-toolbar__badge transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
            })}
            aria-label={
              overlapCount === 1
                ? copy.ariaShowDoubleBooking
                : overlapCursor === null
                  ? copy.ariaShowFirstDoubleBookings(overlapCount)
                  : copy.ariaShowNextDoubleBooking(overlapCursor + 1, overlapCount)
            }
          >
            {overlapCount} {overlapCount === 1 ? copy.doubleBooking : copy.doubleBookings}
            {overlapCursor !== null && overlapCount > 1
              ? ` · ${overlapCursor + 1}/${overlapCount}`
              : ""}
          </button>
        )}
        {travelCount > 0 && (
          <button
            type="button"
            onClick={onCycleTravelGap}
            className={badgeClassName({
              size: "md",
              tone: "count",
              countKind: "warn",
              className:
                "schedule-toolbar__badge transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
            })}
            aria-label={
              travelCount === 1
                ? copy.ariaShowTravelGap
                : travelCursor === null
                  ? copy.ariaShowFirstTravelGaps(travelCount)
                  : copy.ariaShowNextTravelGap(travelCursor + 1, travelCount)
            }
          >
            {travelCount} {travelCount === 1 ? copy.travelGap : copy.travelGaps}
            {travelCursor !== null && travelCount > 1
              ? ` · ${travelCursor + 1}/${travelCount}`
              : ""}
          </button>
        )}
        {overlapCount === 0 && travelCount === 0 && (
          <span className="schedule-toolbar__no-conflicts cf-mono">{copy.noConflicts}</span>
        )}
        {showClearFocus && (
          <button type="button" onClick={onClearFocus} className="schedule-toolbar__clear">
            {copy.clearFocus}
          </button>
        )}
      </div>

      <div className="schedule-toolbar__actions-row">
        <button
          type="button"
          onClick={onOpenFilters}
          className="schedule-toolbar__filters md:hidden"
        >
          {copy.filters}
        </button>
        <button
          type="button"
          data-tour="import"
          onClick={onOpenImport}
          aria-label={copy.importSchedule}
          className="schedule-toolbar__import"
        >
          <span className="schedule-toolbar__import-full">{copy.importSchedule}</span>
          <span className="schedule-toolbar__import-short">{copy.importShort}</span>
        </button>
        <button
          type="button"
          onClick={onNewLesson}
          className="schedule-toolbar__new"
        >
          {copy.newLesson}
        </button>
      </div>
    </div>
  );
}
