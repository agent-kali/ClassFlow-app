"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isGuestDemoEntry, isGuestFixtureVisit, type AppPath } from "@/data/access";
import { useAuthStore } from "@/data/authStore";
import { isMockMode } from "@/data/client";
import { useFxRate } from "@/data/hooks";
import { useClassFlowStore } from "@/data/store";
import { formatFxRate } from "@/domain/money";
import { getLandingCopy } from "@/features/landing/copy";
import { useLocale } from "@/features/landing/locale";
import { getManagerCopy } from "@/features/manager/copy";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  return (
    <Suspense fallback={<TopBarView tour={null} demo={null} />}>
      <TopBarQuery />
    </Suspense>
  );
}

function TopBarQuery() {
  const searchParams = useSearchParams();
  return <TopBarView tour={searchParams.get("tour")} demo={searchParams.get("demo")} />;
}

function TopBarView({ tour, demo }: { tour: string | null; demo: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const fxRate = useFxRate();
  const mockMode = isMockMode();
  const authStatus = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const logout = useAuthStore((s) => s.logout);
  const reset = useClassFlowStore((s) => s.reset);
  const path: AppPath = pathname.startsWith("/teacher")
    ? "/teacher"
    : pathname.startsWith("/login")
      ? "/login"
      : "/manager";
  const guestDemo =
    !mockMode && isGuestFixtureVisit(isGuestDemoEntry(path, { tour, demo }), authStatus);
  const showSchedule = mockMode || guestDemo || role === "manager";
  const showMine = mockMode || guestDemo || role === "teacher";
  const scheduleHref = guestDemo ? "/manager?demo=1" : "/manager";
  const teacherHref = guestDemo ? "/teacher?demo=1" : "/teacher";
  const [locale, setLocale] = useLocale();
  const langCopy = getLandingCopy(locale).nav;
  const chrome = getManagerCopy(locale);

  const tab = (href: string, label: string, tourId?: string) => {
    const hrefPath = href.split("?")[0] ?? href;
    const active = pathname.startsWith(hrefPath);
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
        {showSchedule && tab(scheduleHref, chrome.schedule)}
        {showMine && tab(teacherHref, chrome.mySchedule, "teacher-nav")}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <span
          className="cf-mono hidden text-[11px] text-ink-mute md:inline"
          title={`Bank spot rate captured ${fxRate.capturedOn} (${fxRate.source})`}
        >
          {formatFxRate(fxRate)}
        </span>
        <div className="hidden sm:flex">
          <LocaleToggle
            locale={locale}
            onLocale={setLocale}
            groupLabel={langCopy.langGroup}
            enLabel={langCopy.langEn}
            viLabel={langCopy.langVi}
          />
        </div>
        <ThemeToggle />
        {!mockMode && role && (
          <button
            type="button"
            onClick={() => {
              void logout().finally(() => {
                reset();
                router.replace("/login");
              });
            }}
            className="text-[12px] font-medium text-ink-mute hover:text-ink sm:text-[13px]"
          >
            Log out
          </button>
        )}
      </div>
    </header>
  );
}
