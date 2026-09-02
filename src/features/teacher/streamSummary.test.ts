import { describe, expect, it } from "vitest";
import type { Instant } from "@/domain/earnings";
import type { Lesson } from "@/domain/types";
import { countTeacherStream, formatTeacherStreamSubline } from "./streamSummary";

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
