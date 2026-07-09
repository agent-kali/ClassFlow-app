"use client";

import { useMemo } from "react";
import { endOfMonth, parseISO, startOfMonth } from "date-fns";
import type { Teacher } from "@/domain/types";
import { useEarnings, useFxRate } from "@/data/hooks";
import { toIsoDate, weekDates } from "@/domain/time";
import { formatFxRate, formatUsd } from "@/domain/money";
import { MoneyPair } from "@/components/MoneyPair";

/**
 * Running earnings, read-only, in both currencies. Delivered lessons only;
 * the exclusion of cancelled lessons is stated, not hidden.
 */
export function EarningsCard({ teacher, today }: { teacher: Teacher; today: string }) {
  const fxRate = useFxRate();

  const weekRange = useMemo(() => {
    const days = weekDates(parseISO(today));
    return { from: days[0], to: days[6] };
  }, [today]);
  const monthRange = useMemo(() => {
    const d = parseISO(today);
    return { from: toIsoDate(startOfMonth(d)), to: toIsoDate(endOfMonth(d)) };
  }, [today]);

  const week = useEarnings(teacher, weekRange);
  const month = useEarnings(teacher, monthRange);

  return (
    <section
      className="rounded-lg border border-line bg-raised p-4"
      aria-label="Your earnings"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold">Earned so far</h2>
        <span className="cf-mono text-[10px] text-ink-faint" title={`Rate captured ${fxRate.capturedOn}`}>
          {formatFxRate(fxRate)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-mute">This week</p>
          <MoneyPair usd={week.usd} size="lg" />
          <p className="cf-mono mt-1 text-[11px] text-ink-mute">
            {week.hours.toFixed(2)}h · {week.lessonCount} lessons
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-mute">This month</p>
          <MoneyPair usd={month.usd} size="lg" />
          <p className="cf-mono mt-1 text-[11px] text-ink-mute">
            {month.hours.toFixed(2)}h · {month.lessonCount} lessons
          </p>
        </div>
      </div>

      <p className="mt-3 border-t border-line-soft pt-2 text-[11px] text-ink-mute">
        {formatUsd(teacher.usdRate)}/hour, delivered lessons only.
        {week.excludedCount > 0 && (
          <span> {week.excludedCount} cancelled this week — not counted.</span>
        )}
      </p>
    </section>
  );
}
