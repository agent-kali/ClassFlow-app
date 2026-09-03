"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { landingCopy, type LandingCopy } from "./copy";
import { demoHref, type Locale } from "./locale";

const LINKS = [
  { href: "#product", key: "product" as const },
  { href: "#manager", key: "manager" as const },
  { href: "#teacher", key: "teacher" as const },
  { href: "#architecture", key: "architecture" as const },
];

/** Keep CTA / menu labels sized to the longer locale so the lang toggle doesn't shift. */
function StableLabel({ current, candidates }: { current: string; candidates: string[] }) {
  return (
    <span className="grid justify-items-center *:col-start-1 *:row-start-1">
      {candidates.map((label) => (
        <span key={label} className="invisible whitespace-nowrap" aria-hidden>
          {label}
        </span>
      ))}
      <span className="whitespace-nowrap">{current}</span>
    </span>
  );
}

const DEMO_CTA_LABELS = [landingCopy.en.nav.exploreDemo, landingCopy.vi.nav.exploreDemo];
const OPEN_MENU_LABELS = [landingCopy.en.nav.openMenu, landingCopy.vi.nav.openMenu];
const CLOSE_MENU_LABELS = [landingCopy.en.nav.closeMenu, landingCopy.vi.nav.closeMenu];

export function LandingNav({
  copy,
  locale,
  onLocale,
}: {
  copy: LandingCopy;
  locale: Locale;
  onLocale: (locale: Locale) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-[2px]">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <a href="#top" className="text-[15px] font-bold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          ClassFlow
        </a>

        <nav className="ml-2 hidden min-w-0 flex-1 items-center gap-1 md:flex" aria-label="Landing">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded px-2.5 py-1 text-[13px] font-medium text-ink-mute transition-colors hover:bg-line-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.nav[link.key]}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <LocaleToggle
            locale={locale}
            onLocale={onLocale}
            groupLabel={copy.nav.langGroup}
            enLabel={copy.nav.langEn}
            viLabel={copy.nav.langVi}
          />

          <Link
            href={demoHref(locale)}
            className="hidden rounded bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
          >
            <StableLabel current={copy.nav.exploreDemo} candidates={DEMO_CTA_LABELS} />
          </Link>

          <button
            type="button"
            className="rounded border border-line px-2.5 py-1.5 text-[12px] font-medium md:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <StableLabel
              current={open ? copy.nav.closeMenu : copy.nav.openMenu}
              candidates={open ? CLOSE_MENU_LABELS : OPEN_MENU_LABELS}
            />
          </button>
        </div>
      </div>

      {open && (
        <div
          id={menuId}
          className="border-t border-line bg-surface px-4 py-3 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Landing mobile">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded px-2 py-2 text-[14px] font-medium text-ink hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {copy.nav[link.key]}
              </a>
            ))}
            <Link
              href={demoHref(locale)}
              onClick={close}
              className="mt-2 rounded bg-accent px-3 py-2 text-center text-[13px] font-semibold text-accent-ink"
            >
              {copy.nav.exploreDemo}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
