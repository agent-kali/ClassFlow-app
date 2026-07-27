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

const TARGETS = ["import", "lesson-edit", "teacher-nav"] as const;
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
    const block = target === "lesson-edit" ? "center" : "nearest";
    el.scrollIntoView({ block, inline: "nearest", behavior: "auto" });
    const apply = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    apply();
    requestAnimationFrame(apply);
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
  const pad = target === "lesson-edit" ? 8 : 6;
  const highlight = rect
    ? {
        top: Math.max(4, rect.top - pad),
        left: Math.max(4, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const panelStyle = positionPanel(highlight, target);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="presentation">
      {highlight && (
        <div
          aria-hidden
          className="absolute rounded border-2 border-accent shadow-[0_0_0_9999px_rgba(35,32,26,0.45)] transition-all duration-200"
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
        className="pointer-events-auto absolute z-[81] w-[min(100%-1rem,20.5rem)] rounded border border-line bg-raised p-3.5 shadow-[var(--shadow-pop)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-[min(100%-1.5rem,22rem)] sm:p-4"
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

        {(step === 0 && onOpenImport) || step === 2 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
        ) : null}

        <div className="mt-4 border-t border-line-soft pt-3">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={clearTourParam}
              className="cf-mono text-[11px] font-medium text-ink-faint hover:text-ink-mute focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.skip}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cf-mono text-[11px] font-medium text-ink-faint hover:text-ink-mute focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.reset}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function positionPanel(
  highlight: { top: number; left: number; width: number; height: number } | null,
  target: TourTarget
): CSSProperties {
  if (typeof window === "undefined" || !highlight) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const gap = 12;
  const panelW = Math.min(352, window.innerWidth - 16);
  const panelH = 260;
  // Keep clear of the manager filter rail on md+.
  const leftFloor = window.innerWidth >= 768 ? 200 : 8;

  if (target === "lesson-edit") {
    const rightOf = highlight.left + highlight.width + gap;
    const fitsRight = rightOf + panelW <= window.innerWidth - 8;
    if (fitsRight) {
      return {
        top: Math.min(
          Math.max(8, highlight.top),
          window.innerHeight - panelH - 8
        ),
        left: Math.max(leftFloor, rightOf),
      };
    }
    const leftOf = highlight.left - gap - panelW;
    if (leftOf >= leftFloor) {
      return {
        top: Math.min(
          Math.max(8, highlight.top),
          window.innerHeight - panelH - 8
        ),
        left: leftOf,
      };
    }
  }

  const preferredTop = highlight.top + highlight.height + gap;
  const fitsBelow = preferredTop + panelH < window.innerHeight;
  const top = fitsBelow
    ? preferredTop
    : Math.max(8, highlight.top - gap - panelH);
  let left = Math.max(leftFloor, highlight.left);
  if (left + panelW > window.innerWidth - 8) {
    left = Math.max(leftFloor, window.innerWidth - panelW - 8);
  }
  return { top, left };
}
