"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import type { Teacher } from "@/domain/types";
import { useEarnings, useFxRate, useToday } from "@/data/hooks";
import { formatDuration, toIsoDate, weekDates } from "@/domain/time";
import { formatFxRate, formatUsd } from "@/domain/money";
import { MoneyPair } from "@/components/MoneyPair";
import type { Instant } from "@/domain/earnings";
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
  const today = useToday();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const asOf: Instant = useMemo(
    () => ({ date: today, min: now.getHours() * 60 + now.getMinutes() }),
    [today, now]
  );

  const weekRange = useMemo(() => {
    const days = weekDates(parseISO(anchor));
    return { from: days[0], to: days[6] };
  }, [anchor]);
  const monthRange = useMemo(() => {
    const d = parseISO(anchor);
    return { from: toIsoDate(startOfMonth(d)), to: toIsoDate(endOfMonth(d)) };
  }, [anchor]);

  const week = useEarnings(teacher, weekRange, asOf);
  const month = useEarnings(teacher, monthRange, asOf);
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
          earnedUsd={week.earnedUsd}
          scheduledUsd={week.usd}
          earnedHours={week.earnedHours}
          scheduledHours={week.hours}
          lessonCount={week.lessonCount}
          active={mode === "week"}
        />
        <PeriodColumn
          label="Month"
          rangeLabel={formatRangeLabel(monthRange.from, monthRange.to)}
          earnedUsd={month.earnedUsd}
          scheduledUsd={month.usd}
          earnedHours={month.earnedHours}
          scheduledHours={month.hours}
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
        {formatUsd(teacher.usdRate)}/hour. Scheduled counts until cancelled or no-show.
        Earned is hours already finished.
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
  earnedUsd,
  scheduledUsd,
  earnedHours,
  scheduledHours,
  lessonCount,
  active,
}: {
  label: string;
  rangeLabel: string;
  earnedUsd: number;
  scheduledUsd: number;
  earnedHours: number;
  scheduledHours: number;
  lessonCount: number;
  active: boolean;
}) {
  const showScheduledCaption = earnedUsd !== scheduledUsd;
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
      <MoneyPair usd={earnedUsd} size={active ? "lg" : "md"} />
      {showScheduledCaption && (
        <p className={`cf-mono mt-0.5 text-[10px] ${active ? "text-ink-mute" : "text-ink-faint"}`}>
          of {formatUsd(scheduledUsd)} scheduled
        </p>
      )}
      <p className={`cf-mono mt-1 text-[11px] ${active ? "text-ink-mute" : "text-ink-faint"}`}>
        {formatDuration(earnedHours * 60)} earned · {formatDuration(scheduledHours * 60)} scheduled
        · {lessonCount} lessons
      </p>
    </div>
  );
}
