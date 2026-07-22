"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getLocaleSnapshot,
  parseLangParam,
  setLocale,
  type Locale,
} from "@/features/landing/locale";
import { formatTourProgress, getTourCopy } from "./copy";

const TARGETS = ["import", "timeline", "teacher-nav"] as const;
type TourTarget = (typeof TARGETS)[number];

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function resolveTourLocale(langParam: string | null): Locale {
  return parseLangParam(langParam) ?? getLocaleSnapshot();
}

export function ManagerTour({
  onOpenImport,
}: {
  onOpenImport?: () => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tourParam = searchParams.get("tour");
  const active = tourParam === "1";
  const langParam = searchParams.get("lang");
  const locale = resolveTourLocale(langParam);

  // Persist query lang into the shared preference when the tour starts.
  useEffect(() => {
    if (!active) return;
    const fromQuery = parseLangParam(langParam);
    if (fromQuery) setLocale(fromQuery);
  }, [active, langParam]);

  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const copy = getTourCopy(locale);
  const target = TARGETS[step] as TourTarget;
  const showing = active && !dismissed;

  const clearTourParam = useCallback(() => {
    setDismissed(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("tour");
    const qs = next.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    router.replace(url, { scroll: false });
    // Keep the address bar in sync even if the App Router replace is delayed.
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [pathname, router, searchParams]);

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [target]);

  useLayoutEffect(() => {
    if (!showing) return;
    const frame = requestAnimationFrame(() => measure());
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [showing, measure, step]);

  useEffect(() => {
    if (!showing) return;
    panelRef.current?.focus();
  }, [showing, step]);

  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clearTourParam();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showing, clearTourParam]);

  if (!showing) return null;

  const stepCopy = copy.steps[step];
  const pad = 6;
  const highlight = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const panelStyle = positionPanel(highlight);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="presentation">
      {highlight && (
        <div
          aria-hidden
          className="absolute rounded border-2 border-accent shadow-[0_0_0_9999px_rgba(35,32,26,0.4)] transition-all duration-200"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="pointer-events-auto absolute z-[81] w-[min(100%-1.5rem,22rem)] rounded border border-line bg-raised p-4 shadow-[var(--shadow-pop)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={panelStyle}
      >
        <p className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-accent">
          {formatTourProgress(copy.progress, step + 1)}
        </p>
        <h2 id={titleId} className="mt-1.5 text-[15px] font-bold leading-snug">
          {stepCopy.title}
        </h2>
        <p id={descId} className="mt-2 text-[13px] leading-relaxed text-ink-mute">
          {stepCopy.body}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {step === 0 && onOpenImport && (
            <button
              type="button"
              onClick={onOpenImport}
              className="rounded border border-line px-2.5 py-1.5 text-[12px] font-medium hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Import a schedule
            </button>
          )}
          {step === 2 && (
            <Link
              href="/teacher"
              className="rounded bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.openTeacher}
            </Link>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded border border-line px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copy.back}
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(2, s + 1))}
              className="rounded bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={clearTourParam}
              className="rounded bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.finish}
            </button>
          )}
          <button
            type="button"
            onClick={clearTourParam}
            className="ml-auto text-[12px] font-medium text-ink-mute hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copy.skip}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[12px] font-medium text-ink-mute hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copy.reset}
          </button>
        </div>
      </div>
    </div>
  );
}

function positionPanel(
  highlight: { top: number; left: number; width: number; height: number } | null
): CSSProperties {
  if (typeof window === "undefined" || !highlight) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const gap = 12;
  const panelW = 352;
  const preferredTop = highlight.top + highlight.height + gap;
  const fitsBelow = preferredTop + 220 < window.innerHeight;
  const top = fitsBelow ? preferredTop : Math.max(12, highlight.top - gap - 220);
  let left = highlight.left;
  if (left + panelW > window.innerWidth - 12) {
    left = Math.max(12, window.innerWidth - panelW - 12);
  }
  return { top, left };
}
