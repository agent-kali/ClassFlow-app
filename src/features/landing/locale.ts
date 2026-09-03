"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Locale = "en" | "vi";

export const LOCALE_STORAGE_KEY = "cf-locale";

const listeners = new Set<() => void>();

/** Cached runtime locale. Null until the first client snapshot. */
let cached: Locale | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (v === "vi" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  try {
    const primary = navigator.languages?.[0] ?? navigator.language ?? "";
    if (primary.toLowerCase().startsWith("vi")) return "vi";
  } catch {
    /* ignore */
  }
  return "en";
}

function resolveClientLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale();
}

/** Server + first paint always return `en` so SSR matches hydration. */
function getServerLocale(): Locale {
  return "en";
}

export function getLocaleSnapshot(): Locale {
  if (cached === null) cached = resolveClientLocale();
  return cached;
}

function applyLocale(locale: Locale, persist: boolean) {
  const changed = cached !== locale;
  cached = locale;
  if (persist) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }
  if (changed || persist) emit();
}

/** Explicit EN/VI selection: update runtime, write `cf-locale`, emit. */
export function setLocale(locale: Locale) {
  applyLocale(locale, true);
}

/** Query / navigation init: update runtime and emit, do not write storage. */
export function applyLocaleFromNavigation(locale: Locale) {
  applyLocale(locale, false);
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, getLocaleSnapshot, getServerLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const set = useCallback((next: Locale) => setLocale(next), []);
  return [locale, set];
}

export function parseLangParam(value: string | null | undefined): Locale | null {
  if (value === "vi" || value === "en") return value;
  return null;
}

export function demoHref(locale: Locale): string {
  return `/manager?tour=1&lang=${locale}`;
}
