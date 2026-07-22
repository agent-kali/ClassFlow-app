"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Locale = "en" | "vi";

export const LOCALE_STORAGE_KEY = "cf-locale";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (v === "vi" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}

/** Server + first paint always return `en` so SSR matches hydration. */
function getServerLocale(): Locale {
  return "en";
}

export function getLocaleSnapshot(): Locale {
  return readStoredLocale();
}

export function setLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  emit();
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, getLocaleSnapshot, getServerLocale);
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
