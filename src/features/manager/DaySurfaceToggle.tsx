"use client";

import { useLocale } from "@/features/landing/locale";
import { getManagerCopy } from "./copy";

export type DaySurface = "list" | "scale";

interface Props {
  surface: DaySurface;
  onChange: (surface: DaySurface) => void;
}

/**
 * List is the day. Scale is the clock used to drag a lesson, and it replaces
 * the list rather than sitting beside it.
 */
export function DaySurfaceToggle({ surface, onChange }: Props) {
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);
  const options: { id: DaySurface; label: string; hint: string }[] = [
    { id: "list", label: copy.listView, hint: copy.listHint },
    { id: "scale", label: copy.scaleView, hint: copy.scaleHint },
  ];

  return (
    <div className="day-surface" role="group" aria-label={copy.daySurfaceGroup}>
      <div className="view-toggle">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={surface === option.id}
            title={option.hint}
            className="view-toggle__option"
            data-active={surface === option.id || undefined}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
