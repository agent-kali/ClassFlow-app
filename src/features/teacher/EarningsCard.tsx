"use client";

import { useMemo } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import type { Teacher } from "@/domain/types";
import { useEarnings, useFxRate } from "@/data/hooks";
import { toIsoDate, weekDates } from "@/domain/time";
import { formatFxRate, formatUsd } from "@/domain/money";
import { MoneyPair } from "@/components/MoneyPair";
import type { PeriodMode } from "./PeriodSwitcher";

/** Compact inclusive range: "6–12 Jul", or "28 Jun – 4 Jul" when months differ. */
export function formatRangeLabel(from: string, to: string): string {
  const start = parseISO(from);
  const end = parseISO(to);
  if (format(start, "yyyy-MM") === format(end, "yyyy-MM")) {
    return `${format(start, "d")}–${format(end, "d MMM")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}

/**
 * Week + month earnings for the navigated anchor. The active period mode is
 * emphasized so list scope and the matching total read as one selection.
 */
export function EarningsCard({
  teacher,
  anchor,
  mode,
}: {
  teacher: Teacher;
  anchor: string;
  mode: PeriodMode;
}) {
  const fxRate = useFxRate();

  const weekRange = useMemo(() => {
    const days = weekDates(parseISO(anchor));
    return { from: days[0], to: days[6] };
  }, [anchor]);
  const monthRange = useMemo(() => {
    const d = parseISO(anchor);
    return { from: toIsoDate(startOfMonth(d)), to: toIsoDate(endOfMonth(d)) };
  }, [anchor]);

  const week = useEarnings(teacher, weekRange);
  const month = useEarnings(teacher, monthRange);
  const active = mode === "week" ? week : month;

  return (
    <section
      className="rounded-lg border border-line bg-raised p-4"
      aria-label="Your earnings"
    >
      <h2 className="text-[13px] font-semibold">Earnings</h2>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <PeriodColumn
          label="Week"
          rangeLabel={formatRangeLabel(weekRange.from, weekRange.to)}
          usd={week.usd}
          hours={week.hours}
          lessonCount={week.lessonCount}
          active={mode === "week"}
        />
        <PeriodColumn
          label="Month"
          rangeLabel={formatRangeLabel(monthRange.from, monthRange.to)}
          usd={month.usd}
          hours={month.hours}
          lessonCount={month.lessonCount}
          active={mode === "month"}
        />
      </div>

      <p
        className="cf-mono mt-2 text-[10px] text-ink-faint"
        title={`Rate captured ${fxRate.capturedOn}`}
      >
        {formatFxRate(fxRate)}
      </p>

      <p className="mt-2 border-t border-line-soft pt-2 text-[11px] text-ink-mute">
        {formatUsd(teacher.usdRate)}/hour, delivered lessons only.
        {active.excludedCount > 0 && (
          <span>
            {" "}
            {active.excludedCount} cancelled or no-show in the selected {mode} — not
            counted.
          </span>
        )}
      </p>
    </section>
  );
}

function PeriodColumn({
  label,
  rangeLabel,
  usd,
  hours,
  lessonCount,
  active,
}: {
  label: string;
  rangeLabel: string;
  usd: number;
  hours: number;
  lessonCount: number;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-md px-2 py-1.5 ${active ? "bg-accent-soft/60 ring-1 ring-accent/25" : ""}`}
    >
      <p
        className={`text-[11px] uppercase tracking-wide ${active ? "font-semibold text-accent" : "text-ink-mute"}`}
      >
        {label}
      </p>
      <p className="text-[11px] text-ink-faint">{rangeLabel}</p>
      <MoneyPair usd={usd} size="lg" />
      <p className="cf-mono mt-1 text-[11px] text-ink-mute">
        {hours.toFixed(2)}h · {lessonCount} lessons
      </p>
    </div>
  );
}
