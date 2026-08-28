import type { LandingCopy } from "../copy";

const RAW_ROWS = [
  {
    school: "OT",
    color: "var(--school-teal)",
    cells: ["TUE 07/14", "6:00-7:00PM", "LP12B01B", "205", "DAV"],
  },
  {
    school: "SY",
    color: "var(--school-amber)",
    cells: ["MON", "15:30-16:15", "SJ3", "203", "Katya"],
  },
  {
    school: "LD",
    color: "var(--school-plum)",
    cells: ["14/07", "09:00–10:30", "IL401", "401", "MIR"],
  },
];

const CANONICAL = [
  { key: "teacher", value: "DAV · David Okafor" },
  { key: "group", value: "LP12B01B" },
  { key: "school", value: "OT" },
  { key: "campus", value: "OT03" },
  { key: "time", value: "18:00–19:00" },
  { key: "duration", value: "60 min" },
  { key: "status", value: "scheduled" },
  { key: "rate", value: "$22.00 / hr" },
] as const;

export function NormalizationVignette({ copy }: { copy: LandingCopy }) {
  const fieldLabels = copy.problem.fields;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_auto_1fr] lg:items-center">
      <div className="space-y-2">
        <p className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
          {copy.problem.sourceLabel}
        </p>
        {RAW_ROWS.map((row) => (
          <div
            key={row.school}
            className="overflow-x-auto rounded border border-line bg-surface"
            style={{ borderLeftWidth: 3, borderLeftColor: row.color }}
          >
            <div className="flex min-w-max items-center gap-0 divide-x divide-line-soft">
              <span className="cf-mono px-2 py-2 text-[10px] font-bold text-ink-mute">
                {row.school}
              </span>
              {row.cells.map((cell) => (
                <span key={cell} className="cf-mono px-2.5 py-2 text-[11px] text-ink">
                  {cell}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden justify-center lg:flex" aria-hidden>
        <span className="cf-mono text-[18px] text-accent">→</span>
      </div>
      <div className="flex justify-center lg:hidden" aria-hidden>
        <span className="cf-mono text-[14px] text-accent">↓</span>
      </div>

      <div className="rounded border border-accent/40 bg-raised p-4 shadow-[var(--card-shadow)]">
        <p className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-accent">
          {copy.problem.canonicalLabel}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-2">
          {CANONICAL.map((field) => (
            <div key={field.key} className="border-t border-line-soft pt-1.5">
              <dt className="cf-mono text-[9px] font-semibold uppercase tracking-wide text-ink-faint">
                {fieldLabels[field.key]}
              </dt>
              <dd className="cf-mono mt-0.5 text-[12px] font-medium text-ink">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
