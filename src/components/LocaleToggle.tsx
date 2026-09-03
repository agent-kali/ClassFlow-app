"use client";

import type { Locale } from "@/features/landing/locale";

export function LocaleToggle({
  locale,
  onLocale,
  groupLabel,
  enLabel,
  viLabel,
  className,
}: {
  locale: Locale;
  onLocale: (locale: Locale) => void;
  groupLabel: string;
  enLabel: string;
  viLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={groupLabel}
      data-tour-allowed
      className={`flex shrink-0 overflow-hidden rounded border border-line${className ? ` ${className}` : ""}`}
    >
      {(["en", "vi"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => onLocale(code)}
          className={`cf-mono w-8 shrink-0 py-1 text-center text-[11px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            locale === code
              ? "bg-accent text-accent-ink"
              : "bg-surface text-ink-mute hover:text-ink"
          }`}
        >
          {code === "en" ? enLabel : viLabel}
        </button>
      ))}
    </div>
  );
}
