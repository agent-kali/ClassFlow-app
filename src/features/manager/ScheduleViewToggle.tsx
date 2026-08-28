"use client";

import type { ScheduleViewMode } from "./dayViewState";

interface Props {
  mode: ScheduleViewMode;
  disabled?: boolean;
  onChange: (mode: ScheduleViewMode) => void;
}

const MODES: { id: ScheduleViewMode; label: string; hint: string }[] = [
  { id: "week", label: "Week", hint: "Scan the whole week" },
  { id: "day", label: "Day", hint: "Inspect one day's exact timing" },
];

export function ScheduleViewToggle({ mode, disabled = false, onChange }: Props) {
  return (
    <div className="view-toggle shrink-0" role="group" aria-label="Schedule view">
      {MODES.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          aria-pressed={mode === option.id}
          title={option.hint}
          className="view-toggle__option"
          data-active={mode === option.id || undefined}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
