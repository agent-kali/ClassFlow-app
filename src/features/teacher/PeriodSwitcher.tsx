"use client";

import { addMonths, addWeeks, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { toIsoDate, weekDates } from "@/domain/time";

export type PeriodMode = "week" | "month";

export interface PeriodRange {
  from: string;
  to: string;
}

export function periodRange(mode: PeriodMode, anchor: string): PeriodRange {
  const d = parseISO(anchor);
  if (mode === "week") {
    const days = weekDates(d);
    return { from: days[0], to: days[6] };
  }
  return { from: toIsoDate(startOfMonth(d)), to: toIsoDate(endOfMonth(d)) };
}

/** Human label for the selected scope, e.g. "July 2026" or "6–12 Jul 2026". */
export function periodScopeLabel(mode: PeriodMode, range: PeriodRange): string {
  const start = parseISO(range.from);
  const end = parseISO(range.to);
  if (mode === "month") return format(start, "MMMM yyyy");
  if (format(start, "yyyy-MM") === format(end, "yyyy-MM")) {
    return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

export function shiftPeriodAnchor(mode: PeriodMode, anchor: string, delta: number): string {
  const d = parseISO(anchor);
  if (mode === "week") return toIsoDate(addWeeks(d, delta));
  return toIsoDate(addMonths(d, delta));
}

/**
 * Week / month toggle with prev/next. Owned by the teacher page so earnings
 * and the lesson list stay locked to the same scope.
 */
export function PeriodSwitcher({
  mode,
  onModeChange,
  label,
  onShift,
}: {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  label: string;
  onShift: (delta: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid grid-cols-2 gap-0.5 rounded-md border border-line bg-surface p-0.5"
        role="group"
        aria-label="Period type"
      >
        {(["month", "week"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            aria-pressed={mode === m}
            className={`cf-mono rounded px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              mode === m
                ? "bg-raised text-ink shadow-sm"
                : "text-ink-mute hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onShift(-1)}
          aria-label={`Previous ${mode}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line text-ink-mute transition-colors hover:border-ink-faint hover:text-ink"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 text-center text-[13px] font-semibold leading-tight">
          {label}
        </p>
        <button
          type="button"
          onClick={() => onShift(1)}
          aria-label={`Next ${mode}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line text-ink-mute transition-colors hover:border-ink-faint hover:text-ink"
        >
          ›
        </button>
      </div>
    </div>
  );
}
