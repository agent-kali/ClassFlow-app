import { describe, expect, it } from "vitest";
import { buildWeekLessons } from "@/data/fixtures/lessons";
import { campuses, rooms } from "@/data/fixtures/schools";
import { detectConflicts } from "@/domain/conflicts";
import { parseTime, weekDates } from "@/domain/time";
import type { Lesson } from "@/domain/types";
import {
  DAY_BLOCK_HEIGHT,
  DAY_LANE_GAP,
  DAY_ROW_MIN_HEIGHT,
  DAY_ROW_PAD_Y,
  DEFAULT_DAY_WINDOW,
  buildTeacherRows,
  buildTimeRules,
  buildTravelSegments,
  clampToWindow,
  hourLabelStep,
  laneTop,
  metadataTier,
  minuteToFraction,
  proposeDragTime,
  resolveTimeWindow,
  rowHeight,
  snapDragMinutes,
  spanToFraction,
  windowMinutes,
} from "./dayTimelineLayout";

const WINDOW = DEFAULT_DAY_WINDOW;
const SPAN = windowMinutes(WINDOW); // 810 minutes, 07:30–21:00

/** A Monday, so weekDates() lines up with the fixture's day indices. */
const ANCHOR = new Date("2026-08-17T09:00:00");
const DAYS = weekDates(ANCHOR);
const [, TUESDAY, , THURSDAY, FRIDAY] = DAYS;

const weekLessons = buildWeekLessons(ANCHOR);
const roomsById = new Map(rooms.map((r) => [r.id, r]));
const campusesById = new Map(campuses.map((c) => [c.id, c]));
const campusIdOf = (l: Lesson) => roomsById.get(l.roomId)?.campusId;
const campusNameOf = (l: Lesson) => {
  const id = campusIdOf(l);
  return id ? campusesById.get(id)?.name : undefined;
};

function on(date: string, teacherId?: string): Lesson[] {
  return weekLessons.filter(
    (l) => l.date === date && (!teacherId || l.teacherId === teacherId)
  );
}

function tightTravelKeys(lessons: Lesson[]): Set<string> {
  return new Set(
    detectConflicts(lessons, roomsById)
      .filter((c) => c.type === "travel")
      .map((c) => `${c.lessonIds[0]}|${c.lessonIds[1]}`)
  );
}

function lesson(over: Partial<Lesson> & Pick<Lesson, "id" | "startMin" | "endMin">): Lesson {
  return {
    date: TUESDAY,
    classGroupId: "ot-lp09a02a",
    roomId: "ot-03-201",
    teacherId: "t-mir",
    curriculum: "",
    status: "scheduled",
    ...over,
  };
}

describe("minute to position", () => {
  it("maps the window edges to 0 and 1", () => {
    expect(minuteToFraction(WINDOW.startMin, WINDOW)).toBe(0);
    expect(minuteToFraction(WINDOW.endMin, WINDOW)).toBe(1);
  });

  it("maps the midpoint of the window to 0.5", () => {
    const mid = WINDOW.startMin + SPAN / 2;
    expect(minuteToFraction(mid, WINDOW)).toBeCloseTo(0.5, 10);
  });

  it("places 18:00 proportionally, not on a slot", () => {
    expect(minuteToFraction(parseTime("18:00"), WINDOW)).toBeCloseTo((1080 - 450) / 810, 10);
  });
});

describe("proportional width", () => {
  it.each([35, 45, 70, 90])("gives a %i-minute lesson its real share of the window", (dur) => {
    const start = parseTime("18:00");
    const { width } = spanToFraction(start, start + dur, WINDOW);
    expect(width).toBeCloseTo(dur / SPAN, 10);
  });

  it("makes a 90-minute lesson exactly twice the width of a 45-minute one", () => {
    const a = spanToFraction(1080, 1080 + 45, WINDOW).width;
    const b = spanToFraction(1080, 1080 + 90, WINDOW).width;
    expect(b).toBeCloseTo(a * 2, 10);
  });

  it("keeps duration honest regardless of start time", () => {
    const early = spanToFraction(parseTime("7:50"), parseTime("8:25"), WINDOW).width;
    const late = spanToFraction(parseTime("19:10"), parseTime("19:45"), WINDOW).width;
    expect(early).toBeCloseTo(late, 10);
  });
});

describe("off-grid start times", () => {
  it("places a 07:50 start 20 minutes into the window", () => {
    const { left, width } = spanToFraction(parseTime("7:50"), parseTime("8:25"), WINDOW);
    expect(left).toBeCloseTo(20 / SPAN, 10);
    expect(width).toBeCloseTo(35 / SPAN, 10);
  });

  it("does not round an off-grid lesson onto the half-hour rules", () => {
    const rules = buildTimeRules(WINDOW).map((r) => r.fraction);
    expect(rules).not.toContain(minuteToFraction(parseTime("7:50"), WINDOW));
  });
});

describe("time window", () => {
  it("defaults to 07:30–21:00", () => {
    expect(resolveTimeWindow([])).toEqual({ startMin: 450, endMin: 1260 });
  });

  it("expands to the nearest half hour rather than cropping an early lesson", () => {
    const w = resolveTimeWindow([lesson({ id: "a", startMin: parseTime("6:50"), endMin: 480 })]);
    expect(w.startMin).toBe(parseTime("6:30"));
  });

  it("expands to the nearest half hour rather than cropping a late lesson", () => {
    const w = resolveTimeWindow([
      lesson({ id: "a", startMin: 1260, endMin: parseTime("21:20") }),
    ]);
    expect(w.endMin).toBe(parseTime("21:30"));
  });

  it("never crops the fixture week", () => {
    const w = resolveTimeWindow(weekLessons);
    for (const l of weekLessons) {
      const { left, width } = spanToFraction(l.startMin, l.endMin, w);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + width).toBeLessThanOrEqual(1);
    }
  });

  it("leaves the window alone when every lesson already fits", () => {
    expect(resolveTimeWindow(on(TUESDAY))).toEqual(DEFAULT_DAY_WINDOW);
  });

  it("thins the header labels when the hours crowd together", () => {
    expect(hourLabelStep(82)).toBe(1);
    expect(hourLabelStep(46)).toBe(1);
    expect(hourLabelStep(33)).toBe(2);
    expect(hourLabelStep(18)).toBe(3);
  });

  it("marks hours major and half hours minor", () => {
    const rules = buildTimeRules(WINDOW);
    expect(rules[0]).toMatchObject({ min: 450, major: false });
    expect(rules[1]).toMatchObject({ min: 480, major: true });
    expect(rules.at(-1)).toMatchObject({ min: 1260, major: true });
  });
});

describe("same-teacher overlap", () => {
  it("stacks LEO's Thursday double-booking into two sublanes", () => {
    const [row] = buildTeacherRows(["t-leo"], on(THURSDAY, "t-leo"), WINDOW);
    expect(row.blocks).toHaveLength(2);
    expect(row.laneCount).toBe(2);
    expect(row.blocks.map((b) => b.lane).sort()).toEqual([0, 1]);
  });

  it("keeps both overlapping lessons at their true horizontal positions", () => {
    const [row] = buildTeacherRows(["t-leo"], on(THURSDAY, "t-leo"), WINDOW);
    const at1800 = row.blocks.find((b) => b.lesson.startMin === parseTime("18:00"));
    const at1830 = row.blocks.find((b) => b.lesson.startMin === parseTime("18:30"));
    expect(at1800?.left).toBeCloseTo(minuteToFraction(1080, WINDOW), 10);
    expect(at1830?.left).toBeCloseTo(minuteToFraction(1110, WINDOW), 10);
  });

  it("returns a lesson to lane 0 once the overlap has passed", () => {
    const [row] = buildTeacherRows(
      ["t-leo"],
      [
        lesson({ id: "a", teacherId: "t-leo", startMin: 1080, endMin: 1170 }),
        lesson({ id: "b", teacherId: "t-leo", startMin: 1110, endMin: 1170 }),
        lesson({ id: "c", teacherId: "t-leo", startMin: 1200, endMin: 1260 }),
      ],
      WINDOW
    );
    expect(row.blocks.map((b) => b.lane)).toEqual([0, 1, 0]);
    expect(row.laneCount).toBe(2);
  });

  it("gives a three-way overlap three lanes", () => {
    const [row] = buildTeacherRows(
      ["t-mir"],
      [
        lesson({ id: "a", startMin: 1080, endMin: 1200 }),
        lesson({ id: "b", startMin: 1090, endMin: 1200 }),
        lesson({ id: "c", startMin: 1100, endMin: 1200 }),
      ],
      WINDOW
    );
    expect(row.laneCount).toBe(3);
  });

  it("does not treat back-to-back lessons as an overlap", () => {
    const [row] = buildTeacherRows(
      ["t-mir"],
      [
        lesson({ id: "a", startMin: 1080, endMin: 1140 }),
        lesson({ id: "b", startMin: 1140, endMin: 1200 }),
      ],
      WINDOW
    );
    expect(row.laneCount).toBe(1);
  });
});

describe("different-teacher simultaneity", () => {
  it("keeps MIR, LEO and DAV in separate rows at 18:00 on Tuesday", () => {
    const rows = buildTeacherRows(["t-dav", "t-leo", "t-mir"], on(TUESDAY), WINDOW);
    for (const row of rows) {
      expect(row.laneCount).toBe(1);
      expect(row.blocks.every((b) => b.lane === 0)).toBe(true);
    }
  });

  it("never lets one teacher's lesson land in another teacher's row", () => {
    const rows = buildTeacherRows(["t-dav", "t-leo", "t-mir"], on(TUESDAY), WINDOW);
    for (const row of rows) {
      expect(row.blocks.every((b) => b.lesson.teacherId === row.teacherId)).toBe(true);
    }
  });

  it("keeps a selected teacher with no lessons as an empty row", () => {
    const rows = buildTeacherRows(["t-mir", "t-oli"], on(THURSDAY, "t-mir"), WINDOW);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ teacherId: "t-oli", laneCount: 1, blocks: [] });
  });

  it("preserves the row order it was given", () => {
    const order = ["t-oli", "t-dav", "t-mir"];
    expect(buildTeacherRows(order, on(TUESDAY), WINDOW).map((r) => r.teacherId)).toEqual(order);
  });
});

describe("row geometry is data-only", () => {
  it("sizes a row from its lane count alone", () => {
    expect(rowHeight(1)).toBe(DAY_ROW_MIN_HEIGHT);
    expect(rowHeight(2)).toBe(DAY_ROW_PAD_Y * 2 + DAY_BLOCK_HEIGHT * 2 + DAY_LANE_GAP);
    expect(rowHeight(3)).toBeGreaterThan(rowHeight(2));
  });

  it("centres a single lane in its row", () => {
    expect(laneTop(0, 1)).toBe((DAY_ROW_MIN_HEIGHT - DAY_BLOCK_HEIGHT) / 2);
  });

  it("produces identical geometry on repeated calls, so focus cannot move a card", () => {
    const first = buildTeacherRows(["t-leo"], on(THURSDAY, "t-leo"), WINDOW);
    const second = buildTeacherRows(["t-leo"], on(THURSDAY, "t-leo"), WINDOW);
    expect(second).toEqual(first);
    expect(rowHeight(first[0].laneCount)).toBe(rowHeight(second[0].laneCount));
  });
});

describe("travel segments", () => {
  const tuesdayTight = tightTravelKeys(on(TUESDAY));
  const fridayTight = tightTravelKeys(on(FRIDAY));
  const thursdayTight = tightTravelKeys(on(THURSDAY));

  it("draws MIR's Tuesday OT03 to OT17 hop as a 30-minute segment", () => {
    const segments = buildTravelSegments(
      on(TUESDAY, "t-mir"),
      campusIdOf,
      campusNameOf,
      tuesdayTight,
      WINDOW
    );
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      fromCampus: "OT03",
      toCampus: "OT17",
      gapMin: 30,
      tight: true,
    });
  });

  it("occupies exactly the gap between the two lessons", () => {
    const [segment] = buildTravelSegments(
      on(TUESDAY, "t-mir"),
      campusIdOf,
      campusNameOf,
      tuesdayTight,
      WINDOW
    );
    expect(segment.left).toBeCloseTo(minuteToFraction(parseTime("18:30"), WINDOW), 10);
    expect(segment.width).toBeCloseTo(30 / SPAN, 10);
  });

  it("exposes MIR's Friday OT17 to OT03 return as the existing 20-minute tight gap", () => {
    const segments = buildTravelSegments(
      on(FRIDAY, "t-mir"),
      campusIdOf,
      campusNameOf,
      fridayTight,
      WINDOW
    );
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      fromCampus: "OT17",
      toCampus: "OT03",
      gapMin: 20,
      tight: true,
    });
  });

  it("renders LEO's Thursday overlap as a double-booking, not a journey", () => {
    const segments = buildTravelSegments(
      on(THURSDAY, "t-leo"),
      campusIdOf,
      campusNameOf,
      thursdayTight,
      WINDOW
    );
    expect(segments).toEqual([]);
  });

  it("says nothing when the teacher stays at the same campus", () => {
    const segments = buildTravelSegments(
      [
        lesson({ id: "a", startMin: 1080, endMin: 1140, roomId: "ot-03-201" }),
        lesson({ id: "b", startMin: 1200, endMin: 1260, roomId: "ot-03-205" }),
      ],
      campusIdOf,
      campusNameOf,
      new Set(),
      WINDOW
    );
    expect(segments).toEqual([]);
  });

  it("draws a comfortable campus change as an untight segment", () => {
    const [segment] = buildTravelSegments(
      [
        lesson({ id: "a", startMin: 1080, endMin: 1140, roomId: "ot-03-201" }),
        lesson({ id: "b", startMin: 1230, endMin: 1260, roomId: "ot-17-103" }),
      ],
      campusIdOf,
      campusNameOf,
      new Set(),
      WINDOW
    );
    expect(segment).toMatchObject({ gapMin: 90, tight: false });
  });

  it("ignores cancelled and no-show lessons", () => {
    const segments = buildTravelSegments(
      [
        lesson({ id: "a", startMin: 1080, endMin: 1140, roomId: "ot-03-201" }),
        lesson({
          id: "b",
          startMin: 1200,
          endMin: 1260,
          roomId: "ot-17-103",
          status: "cancelled",
        }),
      ],
      campusIdOf,
      campusNameOf,
      new Set(),
      WINDOW
    );
    expect(segments).toEqual([]);
  });
});

describe("drag snapping", () => {
  it("snaps pointer travel to 5-minute steps", () => {
    const pxPerMin = 2;
    expect(snapDragMinutes(14, pxPerMin)).toBe(5);
    expect(snapDragMinutes(20, pxPerMin)).toBe(10);
    expect(snapDragMinutes(-27, pxPerMin)).toBe(-15);
    expect(snapDragMinutes(2, pxPerMin)).toBe(0);
  });

  it("ignores a drag before the track has been measured", () => {
    expect(snapDragMinutes(120, 0)).toBe(0);
  });

  it("moves the start time and keeps the duration", () => {
    const l = lesson({ id: "a", startMin: parseTime("17:30"), endMin: parseTime("18:40") });
    const moved = proposeDragTime(l, 48, 2, WINDOW);
    expect(moved).toEqual({ startMin: parseTime("17:55"), endMin: parseTime("19:05") });
    expect(moved.endMin - moved.startMin).toBe(l.endMin - l.startMin);
  });

  it("lands on the 5-minute grid even from an off-grid start", () => {
    const l = lesson({ id: "a", startMin: parseTime("7:52"), endMin: parseTime("8:27") });
    expect(proposeDragTime(l, 20, 2, WINDOW).startMin % 5).toBe(0);
  });

  it("returns the lesson unchanged when the pointer has not moved", () => {
    const l = lesson({ id: "a", startMin: 1050, endMin: 1110 });
    expect(proposeDragTime(l, 0, 2, WINDOW)).toEqual({ startMin: 1050, endMin: 1110 });
  });
});

describe("timeline boundary clamping", () => {
  it("stops a lesson at the start of the window", () => {
    expect(clampToWindow(300, 60, WINDOW)).toBe(WINDOW.startMin);
  });

  it("stops a lesson at the end of the window without shortening it", () => {
    expect(clampToWindow(1250, 60, WINDOW)).toBe(WINDOW.endMin - 60);
  });

  it("clamps a dragged lesson rather than letting it leave the timeline", () => {
    const l = lesson({ id: "a", startMin: 1200, endMin: 1260 });
    const moved = proposeDragTime(l, 400, 2, WINDOW);
    expect(moved).toEqual({ startMin: 1200, endMin: 1260 });
  });

  it("survives a lesson longer than the whole window", () => {
    expect(clampToWindow(600, 900, WINDOW)).toBe(WINDOW.startMin);
  });
});

describe("metadata tiers", () => {
  it("drops detail as the block narrows", () => {
    expect(metadataTier(240)).toBe("full");
    expect(metadataTier(120)).toBe("medium");
    expect(metadataTier(60)).toBe("narrow");
    expect(metadataTier(20)).toBe("bare");
  });

  it("never widens a block to fit its text", () => {
    const { width } = spanToFraction(1080, 1115, WINDOW);
    expect(metadataTier(width * 600)).toBe("bare");
    expect(width).toBeCloseTo(35 / SPAN, 10);
  });
});
