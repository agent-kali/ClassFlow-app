import { describe, expect, it } from "vitest";
import { earningsFor, lessonHasEnded, type Instant } from "@/domain/earnings";
import type { Lesson, Teacher } from "@/domain/types";

const TEACHER: Teacher = {
  id: "t-test",
  code: "TST",
  name: "Test Teacher",
  category: "native",
  usdRate: 20,
};

const RANGE = { from: "2026-09-02", to: "2026-09-02" };
const EVENING_START = 18 * 60;
const EVENING_END = 19 * 60 + 30;

function lesson(over: Partial<Lesson> & Pick<Lesson, "id" | "date" | "startMin" | "endMin">): Lesson {
  return {
    classGroupId: "cg-1",
    roomId: "rm-1",
    teacherId: TEACHER.id,
    curriculum: "unit 1",
    status: "scheduled",
    ...over,
  };
}

describe("lessonHasEnded", () => {
  it("treats endMin === asOf.min as ended", () => {
    const asOf: Instant = { date: "2026-09-02", min: EVENING_END };
    expect(
      lessonHasEnded({ date: "2026-09-02", endMin: EVENING_END }, asOf)
    ).toBe(true);
  });

  it("does not treat a later endMin as ended", () => {
    const asOf: Instant = { date: "2026-09-02", min: EVENING_END - 1 };
    expect(
      lessonHasEnded({ date: "2026-09-02", endMin: EVENING_END }, asOf)
    ).toBe(false);
  });
});

describe("earningsFor earned vs scheduled", () => {
  const evening = lesson({
    id: "ls-eve",
    date: "2026-09-02",
    startMin: EVENING_START,
    endMin: EVENING_END,
  });

  it("morning asOf includes an evening lesson in scheduled, not earned", () => {
    const asOf: Instant = { date: "2026-09-02", min: 9 * 60 + 34 };
    const e = earningsFor(TEACHER, [evening], RANGE, asOf);
    expect(e.hours).toBe(1.5);
    expect(e.usd).toBe(30);
    expect(e.lessonCount).toBe(1);
    expect(e.earnedHours).toBe(0);
    expect(e.earnedUsd).toBe(0);
    expect(e.earnedCount).toBe(0);
    expect(e.excludedCount).toBe(0);
  });

  it("asOf after endMin counts the lesson as earned", () => {
    const asOf: Instant = { date: "2026-09-02", min: EVENING_END + 1 };
    const e = earningsFor(TEACHER, [evening], RANGE, asOf);
    expect(e.hours).toBe(1.5);
    expect(e.earnedHours).toBe(1.5);
    expect(e.earnedUsd).toBe(30);
    expect(e.earnedCount).toBe(1);
  });

  it("cancelled in range increments excludedCount and adds no hours", () => {
    const cancelled = lesson({
      id: "ls-can",
      date: "2026-09-02",
      startMin: EVENING_START,
      endMin: EVENING_END,
      status: "cancelled",
    });
    const asOf: Instant = { date: "2026-09-02", min: 22 * 60 };
    const e = earningsFor(TEACHER, [cancelled], RANGE, asOf);
    expect(e.excludedCount).toBe(1);
    expect(e.hours).toBe(0);
    expect(e.earnedHours).toBe(0);
    expect(e.lessonCount).toBe(0);
    expect(e.earnedCount).toBe(0);
  });

  it("no-show in range increments excludedCount and adds no hours", () => {
    const noShow = lesson({
      id: "ls-ns",
      date: "2026-09-02",
      startMin: EVENING_START,
      endMin: EVENING_END,
      status: "no-show",
    });
    const asOf: Instant = { date: "2026-09-02", min: 22 * 60 };
    const e = earningsFor(TEACHER, [noShow], RANGE, asOf);
    expect(e.excludedCount).toBe(1);
    expect(e.hours).toBe(0);
    expect(e.earnedHours).toBe(0);
    expect(e.usd).toBe(0);
    expect(e.earnedUsd).toBe(0);
    expect(e.lessonCount).toBe(0);
    expect(e.earnedCount).toBe(0);
  });

  it("a previous-date lesson is earned regardless of asOf.min", () => {
    const prior = lesson({
      id: "ls-prior",
      date: "2026-09-01",
      startMin: EVENING_START,
      endMin: EVENING_END,
    });
    const asOf: Instant = { date: "2026-09-02", min: 0 };
    const e = earningsFor(
      TEACHER,
      [prior],
      { from: "2026-09-01", to: "2026-09-02" },
      asOf
    );
    expect(e.hours).toBe(1.5);
    expect(e.earnedHours).toBe(1.5);
    expect(e.earnedCount).toBe(1);
  });

  it("ignores a lesson outside the range", () => {
    const outside = lesson({
      id: "ls-out",
      date: "2026-09-10",
      startMin: EVENING_START,
      endMin: EVENING_END,
    });
    const asOf: Instant = { date: "2026-09-02", min: 12 * 60 };
    const e = earningsFor(TEACHER, [outside], RANGE, asOf);
    expect(e.hours).toBe(0);
    expect(e.earnedHours).toBe(0);
    expect(e.lessonCount).toBe(0);
    expect(e.excludedCount).toBe(0);
  });
});
