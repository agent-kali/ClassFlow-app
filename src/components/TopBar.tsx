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
        className={`rounded px-2.5 py-1 text-[13px] font-medium transition-colors ${
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
    <header className="flex items-center gap-4 border-b border-line bg-surface px-4 py-2">
      <Link href="/" className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-bold tracking-tight">ClassFlow</span>
      </Link>
      <nav className="flex items-center gap-1" aria-label="View">
        {tab("/manager", "Schedule")}
        {tab("/teacher", "Teacher view", "teacher-nav")}
      </nav>
      <div className="ml-auto flex items-center gap-3">
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
