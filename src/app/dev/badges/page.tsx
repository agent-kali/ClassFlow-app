"use client";

import { useState, type ReactNode } from "react";
import { Badge, schoolClass, type BadgeSize, type BadgeTone } from "@/components/Badge";
import { TopBar } from "@/components/TopBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { School } from "@/domain/types";
import { schools } from "@/data/fixtures/schools";

const SIZES: BadgeSize[] = ["xs", "sm", "md"];

const STATUS_TONES: { tone: BadgeTone; label: string }[] = [
  { tone: "delivered", label: "delivered" },
  { tone: "planned", label: "planned" },
  { tone: "cancelled", label: "cancelled" },
  { tone: "conflict", label: "conflict" },
];

/**
 * Side-by-side gallery for Badge tones/sizes and cf-card interaction states.
 * Not linked from production nav — open /dev/badges directly.
 */
export default function BadgesDevPage() {
  const [selectedId, setSelectedId] = useState<string | null>("selected");

  return (
    <div className="min-h-dvh bg-ground">
      <TopBar />
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Badge & card states</h1>
            <p className="mt-1 max-w-xl text-[13px] text-ink-mute">
              Unified Badge sizes/tones and lesson card interaction tokens. Tab through the
              schedule cards to verify the focus ring; hover and click to compare selected.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold">Badge — status tones × sizes</h2>
          <div className="overflow-x-auto rounded-md border border-line bg-surface p-4">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="cf-mono text-[11px] text-ink-faint">
                  <th className="pb-3 pr-4 font-medium">Tone</th>
                  {SIZES.map((s) => (
                    <th key={s} className="pb-3 pr-4 font-medium uppercase">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STATUS_TONES.map(({ tone, label }) => (
                  <tr key={tone} className="border-t border-line-soft">
                    <td className="cf-mono py-3 pr-4 text-[12px] text-ink-mute">{tone}</td>
                    {SIZES.map((size) => (
                      <td key={size} className="py-3 pr-4">
                        <Badge size={size} tone={tone}>
                          {label}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold">Badge — school / room / count</h2>
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-4">
            {schools.map((school) => (
              <Badge key={school.id} tone="school" size="sm" school={school}>
                {school.shortName}
              </Badge>
            ))}
            <Badge tone="room" size="xs">
              Coral (105)
            </Badge>
            <Badge tone="room" size="sm">
              205
            </Badge>
            <Badge tone="count" size="md" countKind="danger">
              2 double-bookings
            </Badge>
            <Badge tone="count" size="md" countKind="warn">
              1 tight travel gap
            </Badge>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold">Card states — side by side</h2>
          <p className="text-[12px] text-ink-mute">
            Hover · selected · focus-visible (Tab) · conflict · cancelled · travel pulse
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StateCard
              id="default"
              label="Default / hover"
              school={schools[0]}
              selected={selectedId === "default"}
              onSelect={() => setSelectedId("default")}
            />
            <StateCard
              id="selected"
              label="Selected"
              school={schools[0]}
              selected={selectedId === "selected"}
              onSelect={() => setSelectedId("selected")}
              forceSelected
            />
            <StateCard
              id="focus"
              label="Focus (Tab here)"
              school={schools[1]}
              selected={selectedId === "focus"}
              onSelect={() => setSelectedId("focus")}
            />
            <StateCard
              id="conflict"
              label="Conflict"
              school={schools[2]}
              conflict
              selected={selectedId === "conflict"}
              onSelect={() => setSelectedId("conflict")}
              badge={<Badge size="xs" tone="conflict">conflict</Badge>}
            />
            <StateCard
              id="cancelled"
              label="Cancelled"
              school={schools[3]}
              cancelled
              selected={selectedId === "cancelled"}
              onSelect={() => setSelectedId("cancelled")}
              badge={<Badge size="xs" tone="cancelled">cancelled</Badge>}
            />
            <StateCard
              id="travel"
              label="Travel gap adjacency"
              school={schools[0]}
              travel
              selected={selectedId === "travel"}
              onSelect={() => setSelectedId("travel")}
              badge={<Badge size="xs" tone="conflict">travel</Badge>}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold">Teacher list card states</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            <TeacherStateCard
              school={schools[0]}
              time="19:10–20:10"
              code="LP09A02A"
              badges={
                <>
                  <Badge size="sm" tone="delivered">delivered</Badge>
                  <Badge tone="school" size="sm" school={schools[0]}>
                    LLA
                  </Badge>
                </>
              }
            />
            <TeacherStateCard
              school={schools[0]}
              time="19:10–20:10"
              code="LP09A02A"
              now
              badges={
                <>
                  <Badge size="sm" tone="planned">now</Badge>
                  <Badge tone="school" size="sm" school={schools[0]}>
                    LLA
                  </Badge>
                </>
              }
            />
            <TeacherStateCard
              school={schools[0]}
              time="19:10–20:10"
              code="LP09A02A"
              cancelled
              badges={
                <>
                  <Badge size="sm" tone="cancelled">cancelled</Badge>
                  <Badge tone="school" size="sm" school={schools[0]}>
                    LLA
                  </Badge>
                </>
              }
            />
            <TeacherStateCard
              school={schools[1]}
              time="15:30–16:15"
              code="SJ5"
              cancelled
              badges={
                <>
                  <Badge size="sm" tone="cancelled">no-show</Badge>
                  <Badge tone="school" size="sm" school={schools[1]}>
                    SJS
                  </Badge>
                </>
              }
            />
          </ul>
        </section>
      </main>
    </div>
  );
}

function StateCard({
  id,
  label,
  school,
  selected,
  onSelect,
  conflict,
  cancelled,
  travel,
  forceSelected,
  badge,
}: {
  id: string;
  label: string;
  school: School;
  selected: boolean;
  onSelect: () => void;
  conflict?: boolean;
  cancelled?: boolean;
  travel?: boolean;
  forceSelected?: boolean;
  badge?: ReactNode;
}) {
  const isSelected = forceSelected || selected;
  return (
    <div className="space-y-1.5">
      <p className="cf-mono text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <button
        type="button"
        onClick={onSelect}
        data-selected={isSelected || undefined}
        data-conflict={conflict || undefined}
        data-cancelled={cancelled || undefined}
        className={`cf-card ${schoolClass(school)} flex w-full flex-col gap-1 rounded-sm p-2.5 text-left ${
          travel ? "cf-travel-pulse ring-2 ring-warn" : ""
        }`}
        style={{
          borderLeft: conflict ? undefined : `3px solid ${cancelled ? "var(--line)" : "var(--school)"}`,
          minHeight: 72,
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className={`cf-mono text-[12px] font-semibold ${cancelled ? "text-ink-faint line-through decoration-danger/60" : ""}`}
            style={cancelled ? undefined : { color: "var(--school)" }}
          >
            LP12B01B
          </span>
          <span className={`cf-card__time cf-mono text-[11px] ${cancelled ? "" : "text-ink-mute"}`}>
            18:00
          </span>
          {badge}
        </div>
        <span className={`cf-mono text-[11px] ${cancelled ? "text-ink-faint" : "text-ink"}`}>DAV</span>
        <Badge size="xs" tone="room" className={cancelled ? "bg-transparent! text-ink-faint" : ""}>
          205
        </Badge>
        <span className="sr-only">{id}</span>
      </button>
    </div>
  );
}

function TeacherStateCard({
  school,
  time,
  code,
  badges,
  cancelled,
  now,
}: {
  school: School;
  time: string;
  code: string;
  badges: ReactNode;
  cancelled?: boolean;
  now?: boolean;
}) {
  return (
    <li
      data-cancelled={cancelled || undefined}
      data-now={now || undefined}
      className={`${schoolClass(school)} cf-card list-none rounded-lg p-3`}
    >
      <div className="flex items-center gap-2">
        <span className={`cf-card__time cf-mono text-[13px] font-semibold ${cancelled ? "text-ink-faint" : ""}`}>
          {time}
        </span>
        <span className="ml-auto flex items-center gap-1.5">{badges}</span>
      </div>
      <div className={`mt-1.5 ${cancelled ? "text-ink-faint" : ""}`}>
        <span className="cf-mono text-[15px] font-bold" style={cancelled ? undefined : { color: "var(--school)" }}>
          {code}
        </span>
      </div>
    </li>
  );
}
