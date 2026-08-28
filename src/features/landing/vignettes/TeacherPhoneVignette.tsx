import type { LandingCopy } from "../copy";
import { StaticMoneyPair } from "../StaticMoneyPair";
import type { FxRate } from "@/domain/types";

const FX: FxRate = {
  vndPerUsd: 26150,
  capturedOn: "2026-07-14",
  source: "Vietcombank spot",
};

const LESSONS = [
  {
    day: "Mon 13/07",
    code: "LP12B01B",
    time: "18:00–19:00",
    place: "OT · OT03 205",
    usd: 22,
    status: "scheduled" as const,
  },
  {
    day: "Tue 14/07",
    code: "TN11A02B",
    time: "19:10–20:40",
    place: "OT · OT03 302",
    usd: 33,
    status: "scheduled" as const,
  },
  {
    day: "Wed 15/07",
    code: "IL401",
    time: "09:00–10:30",
    place: "LD · LD7 401",
    usd: 26.25,
    status: "cancelled" as const,
  },
];

export function TeacherPhoneVignette({ copy }: { copy: LandingCopy }) {
  const weekUsd = LESSONS.filter((l) => l.status === "scheduled").reduce((s, l) => s + l.usd, 0);

  return (
    <div className="mx-auto w-full max-w-[340px] origin-top scale-[1.02] sm:scale-105">
      <div className="overflow-hidden rounded-[1.15rem] border border-line bg-raised shadow-[var(--shadow-pop)]">
        <div className="border-b border-line bg-surface px-4 py-3">
          <p className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
            {copy.teacher.phoneLabel}
          </p>
          <p className="mt-0.5 text-[15px] font-bold tracking-tight">DAV · David Okafor</p>
        </div>

        <div className="border-b border-line-soft px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-semibold">{copy.teacher.earningsLabel}</span>
            <span className="cf-mono text-[10px] text-ink-faint">{copy.teacher.weekLabel}</span>
          </div>
          <div className="mt-1">
            <StaticMoneyPair usd={weekUsd} rate={FX} size="lg" />
          </div>
        </div>

        <ul className="divide-y divide-line-soft px-2 py-1.5">
          {LESSONS.map((l) => {
            const cancelled = l.status === "cancelled";
            return (
              <li
                key={l.code + l.day}
                className={`flex items-start justify-between gap-2 rounded-md px-2 py-2 ${
                  cancelled ? "opacity-70" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`cf-mono text-[12px] font-bold ${cancelled ? "line-through" : ""}`}>
                      {l.code}
                    </span>
                    {cancelled && (
                      <span className="cf-mono rounded-sm bg-[var(--danger-soft)] px-1 py-px text-[9px] font-bold uppercase text-danger">
                        cancelled
                      </span>
                    )}
                  </div>
                  <div className="cf-mono mt-0.5 text-[10px] text-ink-mute">
                    {l.day} · {l.time}
                  </div>
                  <div className="cf-mono text-[10px] text-ink-faint">{l.place}</div>
                </div>
                <StaticMoneyPair usd={l.usd} rate={FX} size="sm" struck={cancelled} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
