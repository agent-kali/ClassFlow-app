import type { LandingCopy } from "../copy";
import { StaticMoneyPair } from "../StaticMoneyPair";
import type { FxRate } from "@/domain/types";

const FX: FxRate = {
  vndPerUsd: 26150,
  capturedOn: "2026-07-14",
  source: "Vietcombank spot",
};

const STAGE_LABELS = ["Import", "Map", "Detect", "Update"] as const;

export function WorkflowVignette({ copy }: { copy: LandingCopy }) {
  const stages = [
    {
      label: STAGE_LABELS[0],
      title: copy.manager.steps[0],
      body: (
        <div className="space-y-1.5">
          <div className="cf-mono border border-dashed border-line bg-ground px-2 py-1.5 text-[10px] text-ink-mute">
            OT_Week7_GVNN_v3.xlsx
          </div>
          <div className="cf-mono text-[10px] text-ink-faint">4 rows · 9 columns</div>
        </div>
      ),
    },
    {
      label: STAGE_LABELS[1],
      title: copy.manager.steps[1],
      body: (
        <div className="space-y-1">
          {[
            ["Date", "date"],
            ["Time", "start / end"],
            ["Teacher", "teacher"],
          ].map(([from, to]) => (
            <div key={from} className="flex items-center gap-2 text-[10px]">
              <span className="cf-mono bg-line-soft px-1.5 py-0.5">{from}</span>
              <span className="text-ink-faint" aria-hidden>
                →
              </span>
              <span className="cf-mono text-accent">{to}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: STAGE_LABELS[2],
      title: copy.manager.steps[2],
      body: (
        <div className="flex flex-wrap gap-1.5">
          <span className="cf-mono bg-[var(--danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-danger">
            1 double-booking
          </span>
          <span className="cf-mono bg-[var(--warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-warn">
            1 tight travel gap
          </span>
        </div>
      ),
    },
    {
      label: STAGE_LABELS[3],
      title: copy.manager.steps[3],
      body: (
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="cf-mono text-[9px] uppercase text-ink-faint">DAV · week</div>
            <StaticMoneyPair usd={154} rate={FX} size="md" />
          </div>
          <span className="cf-mono text-[11px] font-semibold text-ok">+$22.00</span>
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden border border-line bg-[color-mix(in_srgb,var(--accent-soft)_28%,var(--surface))]">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
        <span className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-accent">
          Import → Map → Detect → Update
        </span>
        <span className="ml-auto hidden cf-mono text-[10px] text-ink-faint sm:inline">
          manager workspace
        </span>
      </div>

      <ol className="relative grid lg:grid-cols-4">
        {/* Shared horizontal rail on desktop */}
        <div
          className="pointer-events-none absolute left-8 right-8 top-[1.65rem] hidden border-t border-accent/35 lg:block"
          aria-hidden
        />

        {stages.map((stage, i) => (
          <li
            key={stage.label}
            className="relative flex gap-3 border-b border-line px-3 py-4 last:border-b-0 sm:px-4 lg:flex-col lg:border-b-0 lg:border-r lg:border-line lg:last:border-r-0"
          >
            {/* Vertical rail on stacked layouts */}
            {i < stages.length - 1 && (
              <div
                className="pointer-events-none absolute bottom-0 left-[1.35rem] top-10 w-px bg-accent/30 lg:hidden"
                aria-hidden
              />
            )}

            <div className="relative z-[1] flex shrink-0 items-center gap-2 lg:mb-3">
              <span className="cf-mono flex h-7 w-7 items-center justify-center border border-accent bg-raised text-[11px] font-bold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-ink-mute lg:hidden">
                {stage.label}
              </span>
              {i < stages.length - 1 && (
                <span className="cf-mono ml-auto text-[11px] text-accent lg:hidden" aria-hidden>
                  ↓
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5 lg:pt-0">
              <p className="cf-mono mb-1 hidden text-[10px] font-semibold uppercase tracking-wide text-ink-mute lg:block">
                {stage.label}
              </p>
              <p className="text-[13px] font-medium leading-snug text-ink">{stage.title}</p>
              <div className="mt-3 border-t border-line-soft pt-3">{stage.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
