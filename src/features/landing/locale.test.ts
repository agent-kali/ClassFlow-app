import { afterEach, describe, expect, it, vi } from "vitest";

type LocaleModule = typeof import("./locale");

function mockStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("localStorage", storage);
  return map;
}

function mockNavigator(language: string, languages?: string[]) {
  vi.stubGlobal("navigator", {
    language,
    languages: languages ?? [language],
  });
}

async function loadLocale(): Promise<LocaleModule> {
  vi.resetModules();
  return import("./locale");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("locale store", () => {
  it("uses a valid stored cf-locale over the browser locale", async () => {
    const map = mockStorage();
    map.set("cf-locale", "en");
    mockNavigator("vi-VN");
    const { getLocaleSnapshot } = await loadLocale();
    expect(getLocaleSnapshot()).toBe("en");
  });

  it("detects Vietnamese from the primary browser locale when storage is empty", async () => {
    mockStorage();
    mockNavigator("vi-VN");
    const { getLocaleSnapshot, LOCALE_STORAGE_KEY } = await loadLocale();
    expect(getLocaleSnapshot()).toBe("vi");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it("treats VI as Vietnamese, case-insensitive", async () => {
    mockStorage();
    mockNavigator("VI");
    const { getLocaleSnapshot } = await loadLocale();
    expect(getLocaleSnapshot()).toBe("vi");
  });

  it("uses en when the primary browser locale is not Vietnamese", async () => {
    mockStorage();
    mockNavigator("en-US");
    const { getLocaleSnapshot } = await loadLocale();
    expect(getLocaleSnapshot()).toBe("en");
  });

  it("ignores invalid stored values and falls back to browser detection", async () => {
    const map = mockStorage();
    map.set("cf-locale", "fr");
    mockNavigator("vi");
    const { getLocaleSnapshot } = await loadLocale();
    expect(getLocaleSnapshot()).toBe("vi");
  });

  it("does not write auto-detected locale to localStorage", async () => {
    const map = mockStorage();
    mockNavigator("vi");
    const { getLocaleSnapshot, LOCALE_STORAGE_KEY } = await loadLocale();
    getLocaleSnapshot();
    expect(map.has(LOCALE_STORAGE_KEY)).toBe(false);
  });

  it("persists explicit setLocale and keeps the runtime snapshot", async () => {
    mockStorage();
    mockNavigator("en-US");
    const { getLocaleSnapshot, setLocale, LOCALE_STORAGE_KEY } = await loadLocale();
    expect(getLocaleSnapshot()).toBe("en");
    setLocale("vi");
    expect(getLocaleSnapshot()).toBe("vi");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("vi");
  });

  it("writes storage when the user confirms an already auto-detected locale", async () => {
    mockStorage();
    mockNavigator("vi-VN");
    const { getLocaleSnapshot, setLocale, LOCALE_STORAGE_KEY } = await loadLocale();
    expect(getLocaleSnapshot()).toBe("vi");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
    setLocale("vi");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("vi");
  });

  it("applyLocaleFromNavigation updates runtime without writing storage", async () => {
    mockStorage();
    mockNavigator("en-GB");
    const { getLocaleSnapshot, applyLocaleFromNavigation, LOCALE_STORAGE_KEY } =
      await loadLocale();
    expect(getLocaleSnapshot()).toBe("en");
    applyLocaleFromNavigation("vi");
    expect(getLocaleSnapshot()).toBe("vi");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it("parseLangParam accepts only en and vi", async () => {
    const { parseLangParam } = await loadLocale();
    expect(parseLangParam("en")).toBe("en");
    expect(parseLangParam("vi")).toBe("vi");
    expect(parseLangParam("fr")).toBeNull();
    expect(parseLangParam(null)).toBeNull();
  });

  it("keeps demoHref as the tour handoff URL", async () => {
    const { demoHref } = await loadLocale();
    expect(demoHref("vi")).toBe("/manager?tour=1&lang=vi");
    expect(demoHref("en")).toBe("/manager?tour=1&lang=en");
  });
});
