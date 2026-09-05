import { describe, expect, it } from "vitest";
import type { Instant } from "@/domain/earnings";
import type { Lesson } from "@/domain/types";
import {
  countTeacherStream,
  findOperationalLesson,
  formatTeacherStreamSubline,
  minutesUntil,
} from "./streamSummary";

const asOf: Instant = { date: "2026-09-02", min: 10 * 60 };

function L(
  over: Pick<Lesson, "id" | "date" | "startMin" | "endMin" | "status">
): Pick<Lesson, "status" | "date" | "endMin"> {
  return { status: over.status, date: over.date, endMin: over.endMin };
}

describe("countTeacherStream", () => {
  it("splits cancelled and no-show instead of lumping them together", () => {
    const counts = countTeacherStream(
      [
        L({ id: "a", date: "2026-09-02", startMin: 18 * 60, endMin: 19 * 60, status: "scheduled" }),
        L({ id: "b", date: "2026-09-01", startMin: 18 * 60, endMin: 19 * 60, status: "cancelled" }),
        L({ id: "c", date: "2026-09-01", startMin: 15 * 60, endMin: 16 * 60, status: "no-show" }),
      ],
      asOf
    );
    expect(counts.scheduled).toBe(1);
    expect(counts.delivered).toBe(0);
    expect(counts.cancelled).toBe(1);
    expect(counts.noShow).toBe(1);
    expect(counts.allDelivered).toBe(false);
  });

  it("treats a past payable lesson as delivered", () => {
    const counts = countTeacherStream(
      [L({ id: "d", date: "2026-09-01", startMin: 18 * 60, endMin: 19 * 60, status: "scheduled" })],
      asOf
    );
    expect(counts.scheduled).toBe(1);
    expect(counts.delivered).toBe(1);
    expect(counts.allDelivered).toBe(true);
  });
});

type Timed = Pick<Lesson, "id" | "status" | "date" | "startMin" | "endMin">;

function T(
  id: string,
  date: string,
  startMin: number,
  endMin: number,
  status: Lesson["status"] = "scheduled"
): Timed {
  return { id, date, startMin, endMin, status };
}

describe("findOperationalLesson", () => {
  it("returns the lesson in progress right now", () => {
    const now = T("now", "2026-09-02", 9 * 60, 11 * 60);
    const result = findOperationalLesson(
      [T("later", "2026-09-02", 18 * 60, 19 * 60), now],
      asOf
    );
    expect(result).toEqual({ lesson: now, happeningNow: true });
  });

  it("returns the earliest future lesson regardless of input order", () => {
    const soon = T("soon", "2026-09-02", 18 * 60, 19 * 60);
    const result = findOperationalLesson(
      [T("far", "2026-09-20", 8 * 60, 9 * 60), soon, T("mid", "2026-09-03", 8 * 60, 9 * 60)],
      asOf
    );
    expect(result).toEqual({ lesson: soon, happeningNow: false });
  });

  it("never proposes a cancelled or no-show lesson", () => {
    const result = findOperationalLesson(
      [
        T("cancelled", "2026-09-02", 11 * 60, 12 * 60, "cancelled"),
        T("no-show", "2026-09-02", 13 * 60, 14 * 60, "no-show"),
        T("real", "2026-09-04", 18 * 60, 19 * 60),
      ],
      asOf
    );
    expect(result?.lesson.id).toBe("real");
  });

  it("finds a lesson far outside the browsed week or month", () => {
    // The teacher may be looking at March; the next obligation is still theirs.
    const result = findOperationalLesson([T("next-month", "2026-10-14", 8 * 60, 9 * 60)], asOf);
    expect(result?.lesson.id).toBe("next-month");
  });

  it("skips lessons that already finished today", () => {
    const result = findOperationalLesson(
      [T("done", "2026-09-02", 7 * 60, 8 * 60), T("evening", "2026-09-02", 18 * 60, 19 * 60)],
      asOf
    );
    expect(result?.lesson.id).toBe("evening");
  });

  it("returns null when nothing payable remains", () => {
    expect(
      findOperationalLesson(
        [
          T("done", "2026-09-02", 7 * 60, 8 * 60),
          T("off", "2026-09-05", 7 * 60, 8 * 60, "cancelled"),
        ],
        asOf
      )
    ).toBeNull();
  });
});

describe("minutesUntil", () => {
  it("counts across days", () => {
    expect(minutesUntil(asOf, { date: "2026-09-03", startMin: 11 * 60 })).toBe(25 * 60);
  });

  it("never goes negative for a lesson already under way", () => {
    expect(minutesUntil(asOf, { date: "2026-09-02", startMin: 9 * 60 })).toBe(0);
  });
});

describe("formatTeacherStreamSubline", () => {
  it("does not call no-show lessons cancelled", () => {
    const line = formatTeacherStreamSubline(
      {
        scheduled: 5,
        delivered: 2,
        cancelled: 0,
        noShow: 1,
        total: 6,
        allDelivered: false,
      },
      4
    );
    expect(line).toBe("5 scheduled · 2 delivered · 1 no-show");
    expect(line).not.toContain("cancelled");
  });

  it("names both unpaid kinds when both are present", () => {
    expect(
      formatTeacherStreamSubline(
        {
          scheduled: 3,
          delivered: 1,
          cancelled: 2,
          noShow: 1,
          total: 6,
          allDelivered: false,
        },
        3
      )
    ).toBe("3 scheduled · 1 delivered · 2 cancelled · 1 no-show");
  });

  it("describes an empty period", () => {
    expect(
      formatTeacherStreamSubline(
        {
          scheduled: 0,
          delivered: 0,
          cancelled: 0,
          noShow: 0,
          total: 0,
          allDelivered: false,
        },
        0
      )
    ).toBe("No lessons in this period.");
  });
});
