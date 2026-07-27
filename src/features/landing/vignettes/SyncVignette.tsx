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
  const weekUsd = 122.5;
  const travelOk = moved;

  return (
    <div className="overflow-hidden border border-line bg-surface shadow-[var(--card-shadow)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--accent-soft)_35%,var(--surface))] px-4 py-3">
        <p className="cf-mono text-[12px] font-medium text-ink">{copy.sync.changeLabel}</p>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <span
            className="cf-mono inline-flex items-baseline gap-2 border border-line bg-raised px-2.5 py-1 text-[13px] font-bold tracking-tight"
            aria-label="09:45 to 10:30"
          >
            <span className={moved ? "text-ink-faint line-through" : "text-ink"}>09:45</span>
            <span className="text-accent" aria-hidden>
              →
            </span>
            <span className={moved ? "text-accent" : "text-ink"}>10:30</span>
          </span>
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
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* Source: changed lesson */}
        <div className="border-b border-line p-4 lg:border-b-0 lg:border-r">
          <p className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-accent">
            {copy.sync.timeline}
          </p>
          <div className="relative mt-3 h-36 overflow-hidden border border-line-soft bg-ground">
            {[12, 48, 84, 120].map((y) => (
              <div
                key={y}
                className="pointer-events-none absolute inset-x-0 border-t border-line-soft"
                style={{ top: y }}
              />
            ))}
            <div
              className="absolute left-2 right-[40%] border border-line bg-surface px-1.5 py-0.5"
              style={{ top: 14, height: 30 }}
            >
              <span className="cf-mono text-[9px] font-bold">SJ3</span>
              <span className="cf-mono ml-1 text-[8px] text-ink-mute">08:30–09:15</span>
            </div>
            <div
              className={`absolute left-2 right-3 border border-l-[3px] border-l-[var(--school-teal)] px-2 py-1.5 transition-all duration-300 ${
                travelOk
                  ? "border-[var(--card-border)] bg-[var(--card-bg)] ring-1 ring-accent/40"
                  : "border-[var(--card-border-conflict)] bg-[var(--card-bg-conflict)] ring-1 ring-warn/50"
              }`}
              style={{ top: moved ? 78 : 52, height: 48 }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="cf-mono text-[12px] font-bold">LP09A02A</span>
                <span className="cf-mono text-[11px] font-semibold text-ink">
                  {start}–{end}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="cf-mono text-[10px] text-ink-mute">MIR · Wed · NDC 201</span>
                <span className="cf-mono text-[9px] font-semibold uppercase tracking-wide text-accent">
                  {moved ? copy.sync.after : copy.sync.before}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Derived outcomes */}
        <div className="flex flex-col divide-y divide-line bg-[color-mix(in_srgb,var(--ground)_55%,var(--surface))]">
          <DerivedRow
            label={copy.sync.status}
            accent={travelOk ? "ok" : "warn"}
          >
            <p
              className={`cf-mono text-[13px] font-semibold ${
                travelOk ? "text-ok" : "text-warn"
              }`}
            >
              {travelOk ? copy.sync.travelCleared : copy.sync.travelRisk}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-ink-mute">
              {travelOk ? copy.sync.travelOkNote : copy.sync.travelRiskNote}
            </p>
          </DerivedRow>

          <DerivedRow label={copy.sync.earnings} accent="neutral">
            <div className="cf-mono text-[9px] uppercase text-ink-faint">
              MIR · {HOURS}h × ${RATE}
            </div>
            <div className="mt-1 flex items-end justify-between gap-3">
              <StaticMoneyPair usd={weekUsd} rate={FX} size="lg" />
              <span className="cf-mono text-[10px] text-ink-faint">
                {moved ? copy.sync.payStable : copy.sync.payTracks}
              </span>
            </div>
          </DerivedRow>

          <DerivedRow label={copy.sync.teacherSchedule} accent="neutral">
            <div className="border border-line bg-raised px-2.5 py-2">
              <div className="cf-mono text-[9px] font-bold uppercase text-accent">Wed 15/07</div>
              <div className="mt-1.5 flex items-start justify-between gap-2">
                <div>
                  <div className="cf-mono text-[12px] font-bold">LP09A02A</div>
                  <div className="cf-mono text-[10px] text-ink-mute">
                    {start}–{end} · NDC 201
                  </div>
                </div>
                <StaticMoneyPair usd={RATE * HOURS} rate={FX} size="sm" />
              </div>
            </div>
          </DerivedRow>
        </div>
      </div>
    </div>
  );
}

function DerivedRow({
  label,
  children,
  accent,
}: {
  label: string;
  children: ReactNode;
  accent: "ok" | "warn" | "neutral";
}) {
  return (
    <div className="relative px-4 py-3.5">
      <div
        className={`absolute bottom-3 left-0 top-3 w-0.5 ${
          accent === "ok"
            ? "bg-ok"
            : accent === "warn"
              ? "bg-warn"
              : "bg-accent/50"
        }`}
        aria-hidden
      />
      <p className="cf-mono mb-1.5 pl-2 text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
        {label}
      </p>
      <div className="pl-2">{children}</div>
    </div>
  );
}
