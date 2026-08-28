"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useLastPayEffect, useLessons, useTeachers, useToday } from "@/data/hooks";
import { earningsFor } from "@/domain/earnings";
import { weekDates } from "@/domain/time";
import { formatUsd } from "@/domain/money";
import { MoneyPair } from "@/components/MoneyPair";

/**
 * Money as ambient consequence: every teacher's week pay, always on screen.
 * When an edit changes a figure, the affected cell pulses and shows the
 * delta — the manager never has to go looking for the financial effect.
 */
export function PayStrip({ anchorDate }: { anchorDate?: string }) {
  const teachers = useTeachers();
  const lessons = useLessons();
  const today = useToday();
  const effect = useLastPayEffect();

  const days = useMemo(
    () => weekDates(parseISO(anchorDate ?? today)),
    [anchorDate, today]
  );
  const range = { from: days[0], to: days[6] };

  return (
    <footer
      className="pay-strip border-t border-line bg-surface"
      aria-label="This week's pay by teacher"
    >
      <div className="flex min-w-0 items-stretch gap-0 overflow-x-auto">
        <div className="flex shrink-0 flex-col justify-center border-r border-line px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
            Pay, week of {format(parseISO(days[0]), "d MMM")}
          </span>
          <span className="text-[10px] text-ink-faint">delivered hours only</span>
        </div>
        {teachers.map((t) => {
          const e = earningsFor(t, lessons, range);
          const flash = effect && effect.teacherId === t.id;
          return (
            <div
              key={t.id}
              className="relative flex min-w-28 shrink-0 items-center gap-2 border-r border-line-soft px-2.5 py-1.5 sm:min-w-32 sm:gap-2.5 sm:px-3"
            >
            {flash && (
              // Keyed per effect so the pulse re-triggers on every edit.
              <span key={`bg-${effect.id}`} className="cf-pulse pointer-events-none absolute inset-0" />
            )}
            <div className="flex flex-col">
              <span className="cf-mono text-[12px] font-bold">{t.code}</span>
              <span className="cf-mono text-[10px] text-ink-mute">{e.hours.toFixed(2)}h</span>
            </div>
            <MoneyPair usd={e.usd} size="sm" align="right" />
            {flash && (
              <span
                key={effect.id}
                className="cf-delta cf-mono pointer-events-none absolute -top-6 right-2 z-10 rounded-sm px-1.5 py-0.5 text-[11px] font-bold"
                style={{
                  background: effect.deltaUsd < 0 ? "var(--danger-soft)" : "var(--accent-soft)",
                  color: effect.deltaUsd < 0 ? "var(--danger)" : "var(--accent)",
                }}
              >
                {effect.deltaUsd < 0 ? "−" : "+"}
                {formatUsd(Math.abs(effect.deltaUsd))}
              </span>
            )}
            </div>
          );
        })}
      </div>
    </footer>
  );
}
