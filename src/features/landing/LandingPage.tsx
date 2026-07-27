"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getLandingCopy } from "./copy";
import { LandingNav } from "./LandingNav";
import { demoHref, useLocale } from "./locale";
import { HeroTimeline } from "./vignettes/HeroTimeline";
import { NormalizationVignette } from "./vignettes/NormalizationVignette";
import { SyncVignette } from "./vignettes/SyncVignette";
import { TeacherPhoneVignette } from "./vignettes/TeacherPhoneVignette";
import { WorkflowVignette } from "./vignettes/WorkflowVignette";

export function LandingPage() {
  const [locale, setLocale] = useLocale();
  const copy = getLandingCopy(locale);

  return (
    <div id="top" className="min-h-dvh overflow-x-hidden bg-ground text-ink">
      <LandingNav copy={copy} locale={locale} onLocale={setLocale} />

      <main>
        <section
          id="product"
          className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12"
          aria-labelledby="hero-heading"
        >
          <div>
            <p className="cf-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              {copy.hero.eyebrow}
            </p>
            <h1
              id="hero-heading"
              className="mt-3 max-w-[22ch] text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.15] tracking-tight text-ink"
            >
              {copy.hero.headline}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-mute">{copy.hero.body}</p>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-ink-faint">
              {copy.positioning}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={demoHref(locale)}
                className="rounded bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {copy.hero.primaryCta}
              </Link>
              <Link
                href="/teacher"
                className="rounded border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {copy.hero.secondaryCta}
              </Link>
            </div>
            <p className="cf-mono mt-4 text-[11px] text-ink-faint">{copy.hero.honesty}</p>
          </div>
          <HeroTimeline copy={copy} />
        </section>

        <RuleDivider />

        <Section id="problem" headline={copy.problem.headline} tight>
          <NormalizationVignette copy={copy} />
        </Section>

        {/* Manager workflow — featured ledger band */}
        <section
          id="manager"
          className="border-y border-line bg-[color-mix(in_srgb,var(--accent-soft)_18%,var(--ground))]"
          aria-labelledby="manager-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <h2
              id="manager-heading"
              className="max-w-[28ch] text-[clamp(1.4rem,2.6vw,1.95rem)] font-bold leading-snug tracking-tight"
            >
              {copy.manager.headline}
            </h2>
            <div className="mt-7">
              <WorkflowVignette copy={copy} />
            </div>
          </div>
        </section>

        {/* Sync centrepiece — strongest visual weight */}
        <section
          id="sync"
          className="border-b border-line bg-surface"
          aria-labelledby="sync-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <p className="cf-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              09:45 → 10:30
            </p>
            <h2
              id="sync-heading"
              className="mt-2 max-w-[30ch] text-[clamp(1.45rem,2.8vw,2.05rem)] font-bold leading-snug tracking-tight"
            >
              {copy.sync.headline}
            </h2>
            <div className="mt-7">
              <SyncVignette copy={copy} />
            </div>
          </div>
        </section>

        {/* Teacher — compact reveal */}
        <section
          id="teacher"
          className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-10 sm:gap-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:gap-10"
          aria-labelledby="teacher-heading"
        >
          <div className="max-w-md">
            <h2
              id="teacher-heading"
              className="max-w-[24ch] text-[clamp(1.35rem,2.5vw,1.85rem)] font-bold leading-snug tracking-tight"
            >
              {copy.teacher.headline}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-mute">{copy.teacher.body}</p>
            <Link
              href="/teacher"
              className="mt-5 inline-flex rounded border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.hero.secondaryCta}
            </Link>
          </div>
          <TeacherPhoneVignette copy={copy} />
        </section>

        <RuleDivider />

        <Section id="rules" headline={copy.rules.headline} tight>
          <ul className="divide-y divide-line border-y border-line">
            {copy.rules.items.map((rule) => (
              <li key={rule} className="flex gap-4 py-2.5 text-[14px] leading-snug sm:text-[15px]">
                <span className="cf-mono shrink-0 text-accent" aria-hidden>
                  —
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Section>

        <RuleDivider />

        <Section id="architecture" headline={copy.architecture.headline} tight>
          <ul className="max-w-3xl space-y-2.5">
            {copy.architecture.body.map((line) => (
              <li
                key={line}
                className="flex gap-3 text-[14px] leading-relaxed text-ink-mute sm:text-[15px]"
              >
                <span className="cf-mono mt-1 text-[11px] text-accent" aria-hidden>
                  ◆
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl border-l-2 border-accent pl-4 text-[13px] leading-relaxed text-ink-mute">
            {copy.architecture.honesty}
          </p>
        </Section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-[clamp(1.25rem,2.5vw,1.6rem)] font-bold tracking-tight">
            {copy.footer.headline}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={demoHref(locale)}
              className="rounded bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.footer.managerLink}
            </Link>
            <Link
              href="/teacher"
              className="rounded border border-line px-4 py-2.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.footer.teacherLink}
            </Link>
          </div>
          <div className="mt-8 border-t border-line-soft pt-5">
            <p className="text-[14px] font-semibold">{copy.footer.credit}</p>
            <p className="cf-mono mt-1 text-[12px] text-ink-mute">{copy.footer.role}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({
  id,
  headline,
  children,
  tight = false,
}: {
  id: string;
  headline: string;
  children: ReactNode;
  tight?: boolean;
}) {
  return (
    <section
      id={id}
      className={`mx-auto max-w-6xl px-4 sm:px-6 ${tight ? "py-10 sm:py-12" : "py-12 sm:py-14"}`}
      aria-labelledby={`${id}-heading`}
    >
      <h2
        id={`${id}-heading`}
        className="max-w-[28ch] text-[clamp(1.35rem,2.5vw,1.85rem)] font-bold leading-snug tracking-tight"
      >
        {headline}
      </h2>
      <div className="mt-6 sm:mt-7">{children}</div>
    </section>
  );
}

function RuleDivider() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6" aria-hidden>
      <div className="border-t border-line" />
    </div>
  );
}
