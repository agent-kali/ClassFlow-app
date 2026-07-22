"use client";

import Link from "next/link";
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
        {/* Hero */}
        <section
          id="product"
          className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12"
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

        {/* Problem */}
        <Section id="problem" headline={copy.problem.headline}>
          <NormalizationVignette copy={copy} />
        </Section>

        <RuleDivider />

        {/* Manager workflow */}
        <Section id="manager" headline={copy.manager.headline}>
          <WorkflowVignette copy={copy} />
        </Section>

        <RuleDivider />

        {/* Sync centrepiece */}
        <Section id="sync" headline={copy.sync.headline}>
          <SyncVignette copy={copy} />
        </Section>

        <RuleDivider />

        {/* Teacher */}
        <section
          id="teacher"
          className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-center"
          aria-labelledby="teacher-heading"
        >
          <div>
            <h2
              id="teacher-heading"
              className="max-w-[24ch] text-[clamp(1.35rem,2.5vw,1.85rem)] font-bold leading-snug tracking-tight"
            >
              {copy.teacher.headline}
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-mute">
              {copy.teacher.body}
            </p>
            <Link
              href="/teacher"
              className="mt-6 inline-flex rounded border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.hero.secondaryCta}
            </Link>
          </div>
          <TeacherPhoneVignette copy={copy} />
        </section>

        <RuleDivider />

        {/* Domain rules */}
        <Section id="rules" headline={copy.rules.headline}>
          <ul className="divide-y divide-line border-y border-line">
            {copy.rules.items.map((rule) => (
              <li
                key={rule}
                className="flex gap-4 py-3 text-[14px] leading-snug sm:text-[15px]"
              >
                <span className="cf-mono shrink-0 text-accent" aria-hidden>
                  —
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Section>

        <RuleDivider />

        {/* Architecture */}
        <Section id="architecture" headline={copy.architecture.headline}>
          <ul className="max-w-3xl space-y-3">
            {copy.architecture.body.map((line) => (
              <li key={line} className="flex gap-3 text-[14px] leading-relaxed text-ink-mute sm:text-[15px]">
                <span className="cf-mono mt-1 text-[11px] text-accent" aria-hidden>
                  ◆
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl border-l-2 border-accent pl-4 text-[13px] leading-relaxed text-ink-mute">
            {copy.architecture.honesty}
          </p>
        </Section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
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
          <div className="mt-10 border-t border-line-soft pt-6">
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
}: {
  id: string;
  headline: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16"
      aria-labelledby={`${id}-heading`}
    >
      <h2
        id={`${id}-heading`}
        className="max-w-[28ch] text-[clamp(1.35rem,2.5vw,1.85rem)] font-bold leading-snug tracking-tight"
      >
        {headline}
      </h2>
      <div className="mt-8">{children}</div>
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
