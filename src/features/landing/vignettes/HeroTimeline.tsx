import type { LandingCopy } from "../copy";
import { StaticMoneyPair } from "../StaticMoneyPair";
import type { FxRate } from "@/domain/types";

const FX: FxRate = {
  vndPerUsd: 26150,
  capturedOn: "2026-07-14",
  source: "Vietcombank spot",
};

type Block = {
  day: number;
  start: number;
  end: number;
  code: string;
  teacher: string;
  school: "teal" | "amber" | "plum" | "moss";
  conflict?: "overlap" | "travel";
  rate?: number;
};

const BLOCKS: Block[] = [
  { day: 0, start: 540, end: 600, code: "LP12B01B", teacher: "DAV", school: "teal", rate: 22 },
  { day: 0, start: 610, end: 700, code: "TN11A02B", teacher: "DAV", school: "teal" },
  { day: 1, start: 540, end: 585, code: "SJ3", teacher: "KAT", school: "amber" },
  { day: 1, start: 600, end: 645, code: "FLYERS", teacher: "KAT", school: "amber", conflict: "travel" },
  { day: 2, start: 585, end: 645, code: "IL401", teacher: "MIR", school: "plum", conflict: "overlap" },
  { day: 2, start: 600, end: 660, code: "4A1", teacher: "MIR", school: "moss", conflict: "overlap" },
  { day: 3, start: 510, end: 600, code: "LP09A02A", teacher: "MIR", school: "teal", rate: 17.5 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu"];
const PX = 1.1;
const DAY_START = 500;
const DAY_END = 720;

function schoolEdge(color: Block["school"]): string {
  return {
    teal: "border-l-[var(--school-teal)]",
    amber: "border-l-[var(--school-amber)]",
    plum: "border-l-[var(--school-plum)]",
    moss: "border-l-[var(--school-moss)]",
  }[color];
}

export function HeroTimeline({ copy }: { copy: LandingCopy }) {
  const height = (DAY_END - DAY_START) * PX;

  return (
    <figure
      className="landing-reveal overflow-hidden rounded border border-line bg-surface shadow-[var(--card-shadow)]"
      aria-label={copy.hero.vignetteLabel}
    >
      <figcaption className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
          {copy.hero.vignetteLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="cf-mono rounded-sm bg-[var(--danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-danger">
            1 {copy.hero.conflictLabel}
          </span>
          <span className="cf-mono rounded-sm bg-[var(--warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-warn">
            1 {copy.hero.travelLabel}
          </span>
        </span>
      </figcaption>

      <div className="overflow-x-auto">
      <div className="grid min-w-[28rem] grid-cols-[2.25rem_repeat(4,minmax(0,1fr))] gap-0">
        <div className="border-r border-line-soft" style={{ height }} />
        {DAYS.map((day, i) => (
          <div key={day} className="relative border-r border-line-soft last:border-r-0" style={{ height }}>
            <div className="absolute inset-x-0 top-0 z-10 border-b border-line bg-surface/90 px-1.5 py-1">
              <span className="cf-mono text-[10px] font-bold uppercase tracking-wide text-ink-mute">
                {day}
              </span>
            </div>
            {/* hour lines */}
            {[540, 600, 660].map((m) => (
              <div
                key={m}
                className="pointer-events-none absolute inset-x-0 border-t border-line-soft"
                style={{ top: (m - DAY_START) * PX }}
              />
            ))}
            {BLOCKS.filter((b) => b.day === i).map((b) => {
              const top = (b.start - DAY_START) * PX;
              const h = (b.end - b.start) * PX;
              return (
                <div
                  key={`${b.code}-${b.start}`}
                  className={`absolute inset-x-1 overflow-hidden rounded-sm border border-[var(--card-border)] border-l-[3px] bg-[var(--card-bg)] ${schoolEdge(b.school)} ${
                    b.conflict === "overlap"
                      ? "border-[var(--card-border-conflict)] bg-[var(--card-bg-conflict)]"
                      : b.conflict === "travel"
                        ? "ring-1 ring-[var(--warn)]"
                        : ""
                  }`}
                  style={{ top: top + 22, height: Math.max(h, 28) }}
                >
                  <div className="px-1.5 py-0.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="cf-mono text-[10px] font-bold">{b.code}</span>
                      <span className="cf-mono text-[9px] text-ink-mute">
                        {fmt(b.start)}
                      </span>
                    </div>
                    <div className="cf-mono text-[9px] text-ink-mute">{b.teacher}</div>
                    {b.rate != null && (
                      <div className="mt-0.5">
                        <StaticMoneyPair usd={b.rate} rate={FX} size="sm" />
                      </div>
                    )}
                    {b.conflict === "travel" && (
                      <span className="cf-mono mt-0.5 inline-block text-[8px] font-semibold uppercase text-warn">
                        {copy.hero.travelLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      </div>
    </figure>
  );
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
