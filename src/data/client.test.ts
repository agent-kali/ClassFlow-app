import { afterEach, describe, expect, it } from "vitest";
import { API_BASE_URL, isMockMode } from "./client";

const ORIGINAL = process.env.NEXT_PUBLIC_DATA_SOURCE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  else process.env.NEXT_PUBLIC_DATA_SOURCE = ORIGINAL;
});

describe("isMockMode", () => {
  it("is true only when the demo source is explicitly selected", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "mock";
    expect(isMockMode()).toBe(true);
    process.env.NEXT_PUBLIC_DATA_SOURCE = "http";
    expect(isMockMode()).toBe(false);
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    expect(isMockMode()).toBe(false);
  });

  it("does not treat an auth or network failure as mock mode", () => {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    expect(isMockMode()).toBe(false);
  });
});

describe("API_BASE_URL", () => {
  it("is the same-origin proxy and not a configurable second origin", () => {
    expect(API_BASE_URL).toBe("/api");
  });
});
