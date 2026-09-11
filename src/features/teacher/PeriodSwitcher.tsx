"use client";

import type { PeriodMode } from "./period";

export {
  periodRange,
  periodScopeLabel,
  shiftPeriodAnchor,
  formatRangeLabel,
  type PeriodMode,
  type PeriodRange,
} from "./period";

/**
 * Week / month toggle with prev/next. Purely presentational: the teacher page
 * mounts one for schedule navigation and one for earnings scope, each with its
 * own state, so browsing the list never moves the money window.
 */
export function PeriodSwitcher({
  mode,
  onModeChange,
  label,
  onShift,
  scopeName,
}: {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  label: string;
  onShift: (delta: number) => void;
  /** Distinguishes the two switchers for assistive tech, e.g. "schedule". */
  scopeName: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex shrink-0 gap-0.5 rounded-md border border-line bg-surface p-0.5"
        role="group"
        aria-label={`${scopeName} period type`}
      >
        {(["week", "month"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            aria-pressed={mode === m}
            className={`rounded px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
              mode === m
                ? "bg-raised text-ink shadow-sm"
                : "text-ink-mute hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 basis-56 items-center gap-1 sm:max-w-80">
        <button
          type="button"
          onClick={() => onShift(-1)}
          aria-label={`Previous ${scopeName} ${mode}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line text-[15px] text-ink-mute transition-colors hover:border-ink-faint hover:text-ink"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 text-center text-[14px] font-semibold leading-tight">
          {label}
        </p>
        <button
          type="button"
          onClick={() => onShift(1)}
          aria-label={`Next ${scopeName} ${mode}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line text-[15px] text-ink-mute transition-colors hover:border-ink-faint hover:text-ink"
        >
          ›
        </button>
      </div>
    </div>
  );
}
