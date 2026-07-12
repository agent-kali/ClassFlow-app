"use client";

import { forwardRef } from "react";

interface Props {
  /** Conflict key — prevLessonId|nextLessonId. */
  gapKey: string;
  gapMin: number;
  /** Minutes from midnight where the empty gap begins (prev end). */
  gapStartMin: number;
  /** Minutes from midnight where the empty gap ends (next start). */
  gapEndMin: number;
  minuteToY: (min: number) => number;
  fromCampus: string;
  toCampus: string;
  teacherCode: string;
  highlighted?: boolean;
  onActivate?: () => void;
}

/**
 * Inline marker in the empty minutes between two consecutive lessons that
 * need a campus hop. Hit target is a fixed-size box so hover/click stay
 * stable even when the detail label expands below.
 */
export const TravelGapChip = forwardRef<HTMLButtonElement, Props>(function TravelGapChip(
  {
    gapKey,
    gapMin,
    gapStartMin,
    gapEndMin,
    minuteToY,
    fromCampus,
    toCampus,
    teacherCode,
    highlighted = false,
    onActivate,
  },
  ref
) {
  const mid = (gapStartMin + gapEndMin) / 2;
  const top = minuteToY(mid);

  return (
    <button
      ref={ref}
      type="button"
      data-travel-gap={gapKey}
      onClick={(e) => {
        e.stopPropagation();
        onActivate?.();
      }}
      className={`group absolute left-1/2 z-15 flex h-7 min-w-[3.25rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border px-1.5 transition-shadow focus-visible:outline-2 focus-visible:outline-accent ${
        highlighted ? "cf-travel-pulse border-warn shadow-[0_0_0_2px_var(--warn-soft)]" : "border-line-soft"
      }`}
      style={{
        top,
        background: "var(--warn-soft)",
        color: "var(--warn)",
      }}
      aria-label={`${gapMin} minute travel gap, ${fromCampus} to ${toCampus}`}
      title={`${gapMin} min · ${fromCampus} → ${toCampus}`}
    >
      <span className="cf-mono text-[10px] font-bold tabular-nums">{gapMin}&prime;</span>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-sm border border-line bg-raised px-1.5 py-0.5 opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ color: "var(--ink)" }}
      >
        <span className="cf-mono text-[10px] font-semibold" style={{ color: "var(--warn)" }}>
          {teacherCode}
        </span>
        <span className="cf-mono text-[10px] text-ink-mute">
          {" "}
          · {fromCampus} → {toCampus}
        </span>
      </span>
    </button>
  );
});
