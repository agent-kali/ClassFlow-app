"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import type { Teacher } from "@/domain/types";
import type { Instant } from "@/domain/earnings";
import { useEarnings, useFxRate } from "@/data/hooks";
import { formatDuration } from "@/domain/time";
import { formatFxRate, formatUsd, formatVnd, usdToVnd } from "@/domain/money";
import { PeriodSwitcher } from "./PeriodSwitcher";
import { periodScopeLabel, type PeriodMode, type PeriodRange } from "./period";

/**
 * One period, one summary: earned so far, projected total, hours and lesson
 * count. Scope is owned here and never moves the lesson list. The calculation
 * rules live in a non-modal popover instead of a paragraph of documentation.
 */
export function EarningsPanel({
  teacher,
  asOf,
  mode,
  range,
  onModeChange,
  onShift,
}: {
  teacher: Teacher;
  asOf: Instant;
  mode: PeriodMode;
  range: PeriodRange;
  onModeChange: (mode: PeriodMode) => void;
  onShift: (delta: number) => void;
}) {
  const fxRate = useFxRate();
  const earnings = useEarnings(teacher, range, asOf);
  const label = periodScopeLabel(mode, range);

  return (
    <section className="teacher-earnings" aria-label="Your earnings">
      <div className="teacher-earnings__head">
        <h2 className="text-[15px] font-semibold">Earnings</h2>
        <EarningsHelp
          teacher={teacher}
          mode={mode}
          excludedCount={earnings.excludedCount}
          fxLabel={formatFxRate(fxRate)}
          fxCapturedOn={fxRate.capturedOn}
        />
      </div>

      <PeriodSwitcher
        mode={mode}
        onModeChange={onModeChange}
        label={label}
        onShift={onShift}
        scopeName="earnings"
      />

      <p className="teacher-earnings__label">Earned so far</p>
      <p className="teacher-earnings__earned cf-mono">
        <span className="teacher-earnings__usd">{formatUsd(earnings.earnedUsd)}</span>
        <span className="teacher-earnings__vnd">
          {formatVnd(usdToVnd(earnings.earnedUsd, fxRate))}
        </span>
      </p>

      <dl className="teacher-earnings__facts">
        <div>
          <dt>Projected</dt>
          <dd className="cf-mono">
            {formatUsd(earnings.usd)}
            <span>{formatVnd(usdToVnd(earnings.usd, fxRate))}</span>
          </dd>
        </div>
        <div>
          <dt>Hours</dt>
          <dd className="cf-mono">
            {formatDuration(earnings.earnedHours * 60)} of{" "}
            {formatDuration(earnings.hours * 60)}
          </dd>
        </div>
        <div>
          <dt>Lessons</dt>
          <dd className="cf-mono">
            {earnings.earnedCount} of {earnings.lessonCount}
            {earnings.excludedCount > 0 && (
              <span>{earnings.excludedCount} not paid</span>
            )}
          </dd>
        </div>
      </dl>

      <p className="teacher-earnings__fx cf-mono" title={`Rate captured ${fxRate.capturedOn}`}>
        {formatFxRate(fxRate)}
      </p>
    </section>
  );
}

/**
 * Information, not a decision: opens from a labelled button, closes on Escape
 * or outside click, and never traps focus.
 */
function EarningsHelp({
  teacher,
  mode,
  excludedCount,
  fxLabel,
  fxCapturedOn,
}: {
  teacher: Teacher;
  mode: PeriodMode;
  excludedCount: number;
  fxLabel: string;
  fxCapturedOn: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger
        className="teacher-earnings__help"
        aria-label="How earnings are calculated"
      >
        ?
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 w-64 rounded-md border border-line bg-raised p-3 text-[13px] leading-relaxed text-ink-mute"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <p className="text-[13px] font-semibold text-ink">How this is calculated</p>
          <p className="mt-1.5">
            <span className="cf-mono">{formatUsd(teacher.usdRate)}</span> per hour.
            Projected counts every scheduled lesson in this {mode}; earned counts
            only the hours already finished.
          </p>
          <p className="mt-1.5">
            Cancelled and no-show lessons are excluded entirely — didn&apos;t happen,
            not paid.
            {excludedCount > 0 && (
              <>
                {" "}
                This {mode} has <span className="cf-mono">{excludedCount}</span>.
              </>
            )}
          </p>
          <p className="mt-1.5">
            Đồng is derived from the captured spot rate{" "}
            <span className="cf-mono">{fxLabel}</span> ({fxCapturedOn}).
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
