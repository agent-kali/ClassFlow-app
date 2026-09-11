import { describe, expect, it } from "vitest";
import {
  focusedWeekStart,
  isWeekOpen,
  periodRange,
  shiftPeriodAnchor,
} from "./period";

describe("periodRange", () => {
  it("returns the Monday–Sunday week containing 2026-09-02", () => {
    expect(periodRange("week", "2026-09-02")).toEqual({
      from: "2026-08-31",
      to: "2026-09-06",
    });
  });

  it("returns the calendar month for September 2026", () => {
    expect(periodRange("month", "2026-09-02")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });
});

describe("shiftPeriodAnchor", () => {
  it("shifts one week back across the month boundary", () => {
    const anchor = shiftPeriodAnchor("week", "2026-09-02", -1);
    expect(anchor).toBe("2026-08-26");
    expect(periodRange("week", anchor)).toEqual({
      from: "2026-08-24",
      to: "2026-08-30",
    });
  });

  it("shifts one week forward across the month boundary", () => {
    const anchor = shiftPeriodAnchor("week", "2026-09-02", 1);
    expect(anchor).toBe("2026-09-09");
    expect(periodRange("week", anchor)).toEqual({
      from: "2026-09-07",
      to: "2026-09-13",
    });
  });

  it("shifts one month back from September", () => {
    const anchor = shiftPeriodAnchor("month", "2026-09-02", -1);
    expect(anchor).toBe("2026-08-02");
    expect(periodRange("month", anchor)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("shifts one month forward from September", () => {
    const anchor = shiftPeriodAnchor("month", "2026-09-02", 1);
    expect(anchor).toBe("2026-10-02");
    expect(periodRange("month", anchor)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });
});

describe("focusedWeekStart", () => {
  const september = periodRange("month", "2026-09-02");

  it("opens today's week when today is inside the month range", () => {
    expect(focusedWeekStart("2026-09-02", september, "2026-09-02")).toBe("2026-08-31");
  });

  it("opens the anchor's week when browsing a month that does not contain today", () => {
    const august = periodRange("month", "2026-08-02");
    expect(focusedWeekStart("2026-09-02", august, "2026-08-02")).toBe("2026-07-27");
  });
});

describe("isWeekOpen", () => {
  const focus = "2026-08-31";
  const other = "2026-09-07";

  it("opens only the focused week when there are no manual overrides", () => {
    expect(isWeekOpen(focus, focus, {})).toBe(true);
    expect(isWeekOpen(other, focus, {})).toBe(false);
  });

  it("lets an explicit false collapse the focused week", () => {
    expect(isWeekOpen(focus, focus, { [focus]: false })).toBe(false);
    expect(isWeekOpen(other, focus, { [focus]: false })).toBe(false);
  });

  it("lets an explicit true expand a non-focused week without closing the focus", () => {
    expect(isWeekOpen(focus, focus, { [other]: true })).toBe(true);
    expect(isWeekOpen(other, focus, { [other]: true })).toBe(true);
  });
});
