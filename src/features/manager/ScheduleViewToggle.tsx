"use client";

import { useLocale } from "@/features/landing/locale";
import { getManagerCopy } from "./copy";
import type { ScheduleViewMode } from "./dayViewState";

interface Props {
  mode: ScheduleViewMode;
  disabled?: boolean;
  onChange: (mode: ScheduleViewMode) => void;
}

export function ScheduleViewToggle({ mode, disabled = false, onChange }: Props) {
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);
  const modes: { id: ScheduleViewMode; label: string; hint: string }[] = [
    { id: "week", label: copy.week, hint: copy.weekHint },
    { id: "day", label: copy.day, hint: copy.dayHint },
  ];

  return (
    <div className="view-toggle shrink-0" role="group" aria-label={copy.viewGroup}>
      {modes.map((option) => (
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
