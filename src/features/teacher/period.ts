import { addMonths, addWeeks, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { toIsoDate, weekDates } from "@/domain/time";

/**
 * Period math shared by the two independent teacher period machines —
 * schedule navigation and earnings scope. Pure; no React, no UI.
 */

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

/** Compact inclusive range: "6–12 Jul", or "28 Jun – 4 Jul" when months differ. */
export function formatRangeLabel(from: string, to: string): string {
  const start = parseISO(from);
  const end = parseISO(to);
  if (format(start, "yyyy-MM") === format(end, "yyyy-MM")) {
    return `${format(start, "d")}–${format(end, "d MMM")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}
