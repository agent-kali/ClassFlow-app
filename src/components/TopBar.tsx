"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFxRate } from "@/data/hooks";
import { formatFxRate } from "@/domain/money";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const pathname = usePathname();
  const fxRate = useFxRate();

  const tab = (href: string, label: string, tourId?: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        data-tour={tourId}
        className={`rounded px-2 py-1 text-[12px] font-medium transition-colors sm:px-2.5 sm:text-[13px] ${
          active
            ? "bg-accent text-accent-ink"
            : "text-ink-mute hover:bg-line-soft hover:text-ink"
        }`}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="flex min-w-0 items-center gap-2 border-b border-line bg-surface px-3 py-2 sm:gap-4 sm:px-4">
      <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-[14px] font-bold tracking-tight sm:text-[15px]">ClassFlow</span>
      </Link>
      <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1" aria-label="View">
        {tab("/manager", "Schedule")}
        {tab("/teacher", "My schedule", "teacher-nav")}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <span
          className="cf-mono hidden text-[11px] text-ink-mute sm:inline"
          title={`Bank spot rate captured ${fxRate.capturedOn} (${fxRate.source})`}
        >
          {formatFxRate(fxRate)}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
