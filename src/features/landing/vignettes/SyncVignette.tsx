"use client";

import { useState, type ReactNode } from "react";
import type { LandingCopy } from "../copy";
import { StaticMoneyPair } from "../StaticMoneyPair";
import type { FxRate } from "@/domain/types";

const FX: FxRate = {
  vndPerUsd: 26150,
  capturedOn: "2026-07-14",
  source: "Vietcombank spot",
};

const RATE = 17.5;
const HOURS = 1;

export function SyncVignette({ copy }: { copy: LandingCopy }) {
  const [moved, setMoved] = useState(false);
  const start = moved ? "10:30" : "09:45";
  const end = moved ? "11:30" : "10:45";
  const weekUsd = moved ? 122.5 : 122.5; // same hours — pay unchanged; travel status changes
  const travelOk = moved;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="cf-mono text-[12px] font-medium text-ink">{copy.sync.changeLabel}</p>
        <button
          type="button"
          onClick={() => setMoved((v) => !v)}
          className="rounded border border-accent bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {moved ? copy.sync.undoMove : copy.sync.applyMove}
        </button>
        <span className="cf-mono text-[10px] uppercase tracking-wide text-ink-faint">
          {moved ? copy.sync.after : copy.sync.before}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel label={copy.sync.timeline}>
          <div className="relative h-28 overflow-hidden rounded border border-line-soft bg-ground">
            <div className="absolute inset-x-0 top-2 border-t border-line-soft" />
            <div className="absolute inset-x-0 top-10 border-t border-line-soft" />
            <div className="absolute inset-x-0 top-20 border-t border-line-soft" />
            {/* prior lesson ending ~09:17 */}
            <div
              className="absolute left-2 right-2 rounded-sm border border-line bg-surface px-1.5 py-0.5"
              style={{ top: 8, height: 28 }}
            >
              <span className="cf-mono text-[9px] font-bold">SJ3</span>
              <span className="cf-mono ml-1 text-[8px] text-ink-mute">08:30–09:15</span>
            </div>
            <div
              className={`absolute left-2 right-2 rounded-sm border border-l-[3px] border-l-[var(--school-teal)] px-1.5 py-0.5 transition-all duration-300 ${
                travelOk
                  ? "border-[var(--card-border)] bg-[var(--card-bg)]"
                  : "border-[var(--card-border-conflict)] bg-[var(--card-bg-conflict)]"
              }`}
              style={{ top: moved ? 56 : 40, height: 36 }}
            >
              <div className="flex items-baseline justify-between">
                <span className="cf-mono text-[10px] font-bold">LP09A02A</span>
                <span className="cf-mono text-[9px] text-ink-mute">
                  {start}–{end}
                </span>
              </div>
              <span className="cf-mono text-[9px] text-ink-mute">MIR · Wed</span>
            </div>
          </div>
        </Panel>

        <Panel label={copy.sync.status}>
          {travelOk ? (
            <p className="cf-mono text-[12px] font-semibold text-ok">{copy.sync.travelCleared}</p>
          ) : (
            <p className="cf-mono text-[12px] font-semibold text-warn">{copy.sync.travelRisk}</p>
          )}
          <p className="mt-2 text-[11px] leading-snug text-ink-mute">
            {travelOk ? copy.sync.travelOkNote : copy.sync.travelRiskNote}
          </p>
        </Panel>

        <Panel label={copy.sync.earnings}>
          <div className="cf-mono text-[9px] uppercase text-ink-faint">MIR · {HOURS}h × ${RATE}</div>
          <div className="mt-1">
            <StaticMoneyPair usd={weekUsd} rate={FX} size="lg" />
          </div>
          <p className="cf-mono mt-2 text-[10px] text-ink-faint">
            {moved ? copy.sync.payStable : copy.sync.payTracks}
          </p>
        </Panel>

        <Panel label={copy.sync.teacherSchedule}>
          <div className="rounded border border-line bg-ground px-2.5 py-2">
            <div className="cf-mono text-[9px] font-bold uppercase text-accent">Wed 15/07</div>
            <div className="mt-1.5 flex items-start justify-between gap-2">
              <div>
                <div className="cf-mono text-[11px] font-bold">LP09A02A</div>
                <div className="cf-mono text-[10px] text-ink-mute">
                  {start}–{end} · NDC 201
                </div>
              </div>
              <StaticMoneyPair usd={RATE * HOURS} rate={FX} size="sm" />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded border border-line bg-surface p-3 shadow-[var(--card-shadow)]">
      <p className="cf-mono mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
        {label}
      </p>
      {children}
    </div>
  );
}
