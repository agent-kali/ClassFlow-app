"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/features/landing/locale";
import { getManagerCopy } from "@/features/manager/copy";

function subscribeTheme(onChange: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(onChange);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function readStoredTheme(): "light" | "dark" | null {
  try {
    const t = localStorage.getItem("cf-theme");
    if (t === "dark" || t === "light") return t;
  } catch {
    /* ignore */
  }
  return null;
}

function applySystemTheme(dark: boolean) {
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light");
  const [followSystem, setFollowSystem] = useState(() => readStoredTheme() === null);
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);

  useEffect(() => {
    if (!followSystem) return;
    if (readStoredTheme()) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applySystemTheme(media.matches);
    const onChange = () => applySystemTheme(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [followSystem]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("cf-theme", next);
    } catch {
      /* ignore */
    }
    setFollowSystem(false);
  };

  const target = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="cf-mono flex shrink-0 items-center gap-1 rounded border border-line px-1.5 py-1 text-[11px] text-ink-mute transition-colors hover:border-ink-faint hover:text-ink sm:gap-1.5 sm:px-2"
      aria-label={copy.switchToTheme(target)}
    >
      {target === "dark" ? <MoonIcon /> : <SunIcon />}
      <span className="hidden sm:inline">{target === "dark" ? copy.themeDark : copy.themeLight}</span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9L13 13M13 3l-1.1 1.1M4.1 11.9L3 13" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="currentColor">
      <path d="M6 1.5a6.5 6.5 0 108.5 8.5A5.2 5.2 0 016 1.5z" />
    </svg>
  );
}
