"use client";

import { badgeClassName } from "@/components/Badge";
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
  const stepBackLabel = mode === "day" ? "Previous day" : "Previous week";
  const stepForwardLabel = mode === "day" ? "Next day" : "Next week";
  const nowLabel = mode === "day" ? "Today" : "This week";

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
                ? "Show double-booking on the schedule"
                : overlapCursor === null
                  ? `Show first of ${overlapCount} double-bookings`
                  : `Show next double-booking, currently ${overlapCursor + 1} of ${overlapCount}`
            }
          >
            {overlapCount} double-booking{overlapCount > 1 ? "s" : ""}
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
          <span className="schedule-toolbar__no-conflicts cf-mono">No conflicts</span>
        )}
        {showClearFocus && (
          <button type="button" onClick={onClearFocus} className="schedule-toolbar__clear">
            Clear focus
          </button>
        )}
      </div>

      <div className="schedule-toolbar__actions-row">
        <button
          type="button"
          onClick={onOpenFilters}
          className="schedule-toolbar__filters md:hidden"
        >
          Filters
        </button>
        <button
          type="button"
          data-tour="import"
          onClick={onOpenImport}
          aria-label="Import a schedule"
          className="schedule-toolbar__import"
        >
          <span className="schedule-toolbar__import-full">Import a schedule</span>
          <span className="schedule-toolbar__import-short">Import</span>
        </button>
        <button
          type="button"
          onClick={onNewLesson}
          className="schedule-toolbar__new"
        >
          New lesson
        </button>
      </div>
    </div>
  );
}
