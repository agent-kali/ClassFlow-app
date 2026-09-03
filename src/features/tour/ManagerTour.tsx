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
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LocaleToggle } from "@/components/LocaleToggle";
import {
  applyLocaleFromNavigation,
  parseLangParam,
  useLocale,
} from "@/features/landing/locale";
import { formatTourProgress, getTourCopy } from "./copy";

const TARGETS = ["import", "lesson-edit", "teacher-nav"] as const;
type TourTarget = (typeof TARGETS)[number];
type TourDirection = "forward" | "back";

const TINT = "rgba(35,32,26,0.45)";

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function stepLayerClass(
  i: number,
  step: number,
  outgoing: number | null,
  direction: TourDirection,
  enterReady: boolean
): string {
  const isActive = i === step;
  const isOutgoing = outgoing !== null && i === outgoing && i !== step;
  if (isActive && !enterReady) {
    return direction === "forward"
      ? "cf-tour-step cf-tour-step--enter-forward"
      : "cf-tour-step cf-tour-step--enter-back";
  }
  if (isActive) return "cf-tour-step cf-tour-step--active";
  if (isOutgoing) {
    return direction === "forward"
      ? "cf-tour-step cf-tour-step--exit-forward"
      : "cf-tour-step cf-tour-step--exit-back";
  }
  return "cf-tour-step cf-tour-step--inactive";
}

export function ManagerTour({
  onOpenImport,
  onStepChange,
}: {
  onOpenImport?: () => void;
  onStepChange?: (step: number) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tourParam = searchParams.get("tour");
  const active = tourParam === "1";
  const [locale, setLocale] = useLocale();
  const handoffAppliedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      handoffAppliedRef.current = false;
      return;
    }
    if (handoffAppliedRef.current) return;
    handoffAppliedRef.current = true;
    const fromQuery = parseLangParam(searchParams.get("lang"));
    if (fromQuery) applyLocaleFromNavigation(fromQuery);
    if (!searchParams.has("lang")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("lang");
    const qs = next.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    router.replace(url, { scroll: false });
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [active, searchParams, pathname, router]);

  const [step, setStep] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [direction, setDirection] = useState<TourDirection>("forward");
  const [enterReady, setEnterReady] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const [panelReady, setPanelReady] = useState(false);
  const [panelHeight, setPanelHeight] = useState(310);
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const copy = getTourCopy(locale);
  const target = TARGETS[step] as TourTarget;
  const showing = active && !dismissed;

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(2, next));
    if (clamped === step) return;
    setOutgoing(step);
    setDirection(clamped > step ? "forward" : "back");
    setStep(clamped);
    setEnterReady(false);
    setPanelReady(false);
  };

  useLayoutEffect(() => {
    if (enterReady) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setEnterReady(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [enterReady, step, direction]);

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
    requestAnimationFrame(() => {
      apply();
      setPanelReady(true);
    });
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

  useEffect(() => {
    if (!showing) return;
    onStepChange?.(step);
  }, [showing, step, onStepChange]);

  useEffect(() => {
    if (!showing) return;
    const allowTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof Element)) return false;
      if (panelRef.current?.contains(el)) return true;
      if (el.closest("[data-tour-allowed]")) return true;
      if (target !== "lesson-edit") return false;
      const tourEl = document.querySelector('[data-tour="lesson-edit"]');
      return !!tourEl && (tourEl === el || tourEl.contains(el));
    };

    const block = (e: Event) => {
      if (allowTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("pointerdown", block, true);
    document.addEventListener("click", block, true);
    return () => {
      document.removeEventListener("pointerdown", block, true);
      document.removeEventListener("click", block, true);
    };
  }, [showing, target]);

  useLayoutEffect(() => {
    if (!showing) return;
    const h = panelRef.current?.offsetHeight;
    if (h) setPanelHeight((prev) => (prev === h ? prev : h));
  }, [showing, step, enterReady, locale]);

  if (!showing) return null;

  const pad = target === "lesson-edit" ? 8 : 6;
  const highlight = rect
    ? {
        top: Math.max(4, rect.top - pad),
        left: Math.max(4, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const panelStyle = positionPanel(highlight, target, panelHeight);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]" role="presentation">
      <TourBackdrop highlight={highlight} target={target} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${baseId}-title-${step}`}
        aria-describedby={`${baseId}-body-${step}`}
        tabIndex={-1}
        className={`pointer-events-auto absolute z-[81] w-[min(100%-1rem,20.5rem)] rounded border border-line bg-raised p-3.5 shadow-[var(--shadow-pop)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-[min(100%-1.5rem,22rem)] sm:p-4 cf-tour-panel${
          panelReady ? " cf-tour-panel--ready" : ""
        }`}
        style={panelStyle}
      >
        <p className="cf-mono text-[10px] font-semibold uppercase tracking-wide text-accent">
          {formatTourProgress(copy.progress, step + 1)}
        </p>
        <div className="cf-tour-steps">
          {copy.steps.map((stepCopy, i) => {
            const isActive = i === step;
            return (
              <div
                key={i}
                className={stepLayerClass(i, step, outgoing, direction, enterReady)}
                aria-hidden={!isActive}
                inert={!isActive}
              >
                <h2
                  id={`${baseId}-title-${i}`}
                  className="mt-1.5 text-[15px] font-bold leading-snug"
                >
                  {stepCopy.title}
                </h2>
                <p
                  id={`${baseId}-body-${i}`}
                  className="mt-2 text-[13px] leading-relaxed text-ink-mute"
                >
                  {stepCopy.body}
                </p>
                {i === 0 && onOpenImport ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenImport}
                      className="rounded border border-line px-2.5 py-1.5 text-[12px] font-medium hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {copy.importSchedule}
                    </button>
                  </div>
                ) : null}
                {i === 2 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href="/teacher"
                      className="rounded bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {copy.openTeacher}
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-line-soft pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => go(step - 1)}
              className="rounded border border-line px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.back}
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => go(step + 1)}
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
            <LocaleToggle
              locale={locale}
              onLocale={setLocale}
              groupLabel={copy.langGroup}
              enLabel={copy.langEn}
              viLabel={copy.langVi}
              className="ml-auto"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TourBackdrop({
  highlight,
  target,
}: {
  highlight: { top: number; left: number; width: number; height: number } | null;
  target: TourTarget;
}) {
  const panelClass = "pointer-events-auto fixed";
  const bg = { backgroundColor: TINT };
  const showHole = target === "lesson-edit" && highlight;
  const ringClass =
    "cf-tour-highlight pointer-events-none fixed rounded border-2 border-accent";

  if (!showHole) {
    return (
      <>
        <div aria-hidden className={`${panelClass} inset-0`} style={bg} />
        {highlight && (
          <div
            aria-hidden
            className={ringClass}
            style={{
              top: highlight.top,
              left: highlight.left,
              width: highlight.width,
              height: highlight.height,
            }}
          />
        )}
      </>
    );
  }

  const { top, left, width, height } = highlight;
  const right = left + width;
  const bottom = top + height;

  return (
    <>
      <div
        aria-hidden
        className={ringClass}
        style={{ top, left, width, height }}
      />
      <div className={panelClass} style={{ ...bg, top: 0, left: 0, right: 0, height: top }} />
      <div className={panelClass} style={{ ...bg, top, left: 0, width: left, height }} />
      <div className={panelClass} style={{ ...bg, top, left: right, right: 0, height }} />
      <div className={panelClass} style={{ ...bg, top: bottom, left: 0, right: 0, bottom: 0 }} />
    </>
  );
}

function clampPanelTop(top: number, panelH: number): number {
  const maxTop = Math.max(8, window.innerHeight - panelH - 8);
  return Math.min(Math.max(8, top), maxTop);
}

function positionPanel(
  highlight: { top: number; left: number; width: number; height: number } | null,
  target: TourTarget,
  panelH: number
): CSSProperties {
  const panelW =
    typeof window === "undefined" ? 352 : Math.min(352, window.innerWidth - 16);

  if (typeof window === "undefined") {
    return { top: 8, left: 8 };
  }

  if (!highlight) {
    return {
      top: clampPanelTop(window.innerHeight / 2 - panelH / 2, panelH),
      left: Math.max(8, window.innerWidth / 2 - panelW / 2),
    };
  }

  const gap = 12;
  // Keep clear of the manager filter rail on md+.
  const leftFloor = window.innerWidth >= 768 ? 200 : 8;

  if (target === "lesson-edit") {
    const rightOf = highlight.left + highlight.width + gap;
    const fitsRight = rightOf + panelW <= window.innerWidth - 8;
    if (fitsRight) {
      return {
        top: clampPanelTop(highlight.top, panelH),
        left: Math.max(leftFloor, rightOf),
      };
    }
    const leftOf = highlight.left - gap - panelW;
    if (leftOf >= leftFloor) {
      return {
        top: clampPanelTop(highlight.top, panelH),
        left: leftOf,
      };
    }
  }

  const preferredTop = highlight.top + highlight.height + gap;
  const fitsBelow = preferredTop + panelH < window.innerHeight - 8;
  const top = fitsBelow
    ? preferredTop
    : highlight.top - gap - panelH;
  let left = Math.max(leftFloor, highlight.left);
  if (left + panelW > window.innerWidth - 8) {
    left = Math.max(leftFloor, window.innerWidth - panelW - 8);
  }
  return { top: clampPanelTop(top, panelH), left };
}
