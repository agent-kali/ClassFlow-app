import type { LandingCopy } from "../copy";
import { StaticMoneyPair } from "../StaticMoneyPair";
import type { FxRate } from "@/domain/types";

const FX: FxRate = {
  vndPerUsd: 26150,
  capturedOn: "2026-07-14",
  source: "Vietcombank spot",
};

export function WorkflowVignette({ copy }: { copy: LandingCopy }) {
  const panels = [
    {
      title: copy.manager.steps[0],
      body: (
        <div className="space-y-1.5">
          <div className="cf-mono rounded border border-dashed border-line bg-ground px-2 py-1.5 text-[10px] text-ink-mute">
            LLA_Week7_GVNN_v3.xlsx
          </div>
          <div className="cf-mono text-[10px] text-ink-faint">4 rows · 9 columns</div>
        </div>
      ),
    },
    {
      title: copy.manager.steps[1],
      body: (
        <div className="space-y-1">
          {[
            ["Date", "date"],
            ["Time", "start / end"],
            ["Teacher", "teacher"],
          ].map(([from, to]) => (
            <div key={from} className="flex items-center gap-2 text-[10px]">
              <span className="cf-mono rounded bg-line-soft px-1.5 py-0.5">{from}</span>
              <span className="text-ink-faint">→</span>
              <span className="cf-mono text-accent">{to}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: copy.manager.steps[2],
      body: (
        <div className="flex flex-wrap gap-1.5">
          <span className="cf-mono rounded-sm bg-[var(--danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-danger">
            1 double-booking
          </span>
          <span className="cf-mono rounded-sm bg-[var(--warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-warn">
            1 tight travel gap
          </span>
        </div>
      ),
    },
    {
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
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {panels.map((panel, i) => (
        <li
          key={panel.title}
          className="flex flex-col rounded border border-line bg-surface p-3 shadow-[var(--card-shadow)]"
        >
          <span className="cf-mono text-[10px] font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink">{panel.title}</p>
          <div className="mt-3 flex-1 border-t border-line-soft pt-3">{panel.body}</div>
        </li>
      ))}
    </ol>
  );
}
