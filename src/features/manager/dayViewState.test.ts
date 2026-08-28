import { describe, expect, it } from "vitest";
import { buildWeekLessons } from "@/data/fixtures/lessons";
import { campuses, rooms } from "@/data/fixtures/schools";
import { detectConflicts, isTeacherOverlap } from "@/domain/conflicts";
import { weekDates } from "@/domain/time";
import type { Lesson } from "@/domain/types";
import type { ScheduleFilters } from "./filters";
import {
  buildDayIssueMarkers,
  isWideningNeeded,
  resolveInitialDayDate,
  resolveIssueNavigation,
  shiftDay,
} from "./dayViewState";

const ANCHOR = new Date("2026-08-17T09:00:00");
const DAYS = weekDates(ANCHOR);
const [MONDAY, TUESDAY, , THURSDAY, FRIDAY] = DAYS;

const weekLessons = buildWeekLessons(ANCHOR);
const roomsById = new Map(rooms.map((r) => [r.id, r]));
const campusesById = new Map(campuses.map((c) => [c.id, c]));
const conflicts = detectConflicts(weekLessons, roomsById);

const locate = (lesson: Lesson) => {
  const campusId = roomsById.get(lesson.roomId)?.campusId;
  return { campusId, schoolId: campusId ? campusesById.get(campusId)?.schoolId : undefined };
};

function filters(over: Partial<ScheduleFilters> = {}): ScheduleFilters {
  return {
    schoolIds: new Set<string>(),
    campusIds: new Set<string>(),
    teacherIds: new Set<string>(),
    ...over,
  };
}

function pairOf(predicate: (c: (typeof conflicts)[number]) => boolean): Lesson[] {
  const conflict = conflicts.find(predicate);
  if (!conflict) throw new Error("fixture conflict missing");
  return conflict.lessonIds.map((id) => weekLessons.find((l) => l.id === id)!);
}

const overlapPair = pairOf((c) => isTeacherOverlap(c));
const travelPair = pairOf((c) => c.type === "travel");

describe("opening a day", () => {
  it("opens the highlighted date", () => {
    expect(
      resolveInitialDayDate({ highlightedDate: THURSDAY, today: MONDAY, weekDays: DAYS })
    ).toBe(THURSDAY);
  });

  it("falls back to today when today is inside the visible week", () => {
    expect(
      resolveInitialDayDate({ highlightedDate: null, today: FRIDAY, weekDays: DAYS })
    ).toBe(FRIDAY);
  });

  it("falls back to Monday when today is elsewhere", () => {
    expect(
      resolveInitialDayDate({ highlightedDate: null, today: "2026-01-05", weekDays: DAYS })
    ).toBe(MONDAY);
  });

  it("ignores a highlighted date from another week", () => {
    expect(
      resolveInitialDayDate({
        highlightedDate: "2026-01-05",
        today: TUESDAY,
        weekDays: DAYS,
      })
    ).toBe(TUESDAY);
  });
});

describe("day navigation", () => {
  it("steps forward and back one day", () => {
    expect(shiftDay(TUESDAY, 1)).toBe(DAYS[2]);
    expect(shiftDay(TUESDAY, -1)).toBe(MONDAY);
  });

  it("crosses the week boundary", () => {
    expect(shiftDay(DAYS[6], 1)).toBe(shiftDay(MONDAY, 7));
    expect(shiftDay(MONDAY, -1)).toBe("2026-08-16");
  });
});

describe("conflict navigation", () => {
  it("finds the date and teacher of LEO's Thursday double-booking", () => {
    const nav = resolveIssueNavigation(overlapPair, filters(), locate);
    expect(nav?.date).toBe(THURSDAY);
    expect(nav?.teacherIds).toEqual(["t-leo"]);
    expect(nav?.focusLessonIds).toHaveLength(2);
  });

  it("finds the date and teacher of MIR's tight travel gap", () => {
    const nav = resolveIssueNavigation(travelPair, filters(), locate);
    expect(nav?.date).toBe(TUESDAY);
    expect(nav?.teacherIds).toEqual(["t-mir"]);
  });

  it("needs no widening when no filter is active", () => {
    const nav = resolveIssueNavigation(overlapPair, filters(), locate);
    expect(isWideningNeeded(nav!.widen)).toBe(false);
  });

  it("adds the affected teacher to an active teacher filter", () => {
    const nav = resolveIssueNavigation(
      overlapPair,
      filters({ teacherIds: new Set(["t-dav"]) }),
      locate
    );
    expect(nav?.widen.teacherIds).toEqual(["t-leo"]);
  });

  it("leaves unrelated active filters in place rather than clearing them", () => {
    const active = filters({
      teacherIds: new Set(["t-dav"]),
      schoolIds: new Set(["ot"]),
      campusIds: new Set(["ot-03"]),
    });
    const nav = resolveIssueNavigation(overlapPair, active, locate);
    expect(active.teacherIds).toEqual(new Set(["t-dav"]));
    expect(nav?.widen.schoolIds).toEqual(["ld", "sy"]);
    expect(nav?.widen.campusIds).toEqual(["ld-07", "sy-03"]);
  });

  it("adds nothing that is already selected", () => {
    const nav = resolveIssueNavigation(
      overlapPair,
      filters({ teacherIds: new Set(["t-leo"]) }),
      locate
    );
    expect(nav?.widen.teacherIds).toEqual([]);
  });

  it("opens the earlier of the two lessons' dates", () => {
    const nav = resolveIssueNavigation([...travelPair].reverse(), filters(), locate);
    expect(nav?.date).toBe(TUESDAY);
  });

  it("returns nothing when the issue has no lessons", () => {
    expect(resolveIssueNavigation([], filters(), locate)).toBeNull();
  });
});

describe("date strip markers", () => {
  const markers = buildDayIssueMarkers(DAYS, weekLessons, conflicts);
  const markerFor = (date: string) => markers.find((m) => m.date === date)!;

  it("counts the lessons on each day", () => {
    expect(markerFor(TUESDAY).count).toBe(
      weekLessons.filter((l) => l.date === TUESDAY).length
    );
  });

  it("marks Thursday with the louder double-booking", () => {
    expect(markerFor(THURSDAY).issue).toBe("overlap");
  });

  it("marks a travel-only day amber", () => {
    expect(markerFor(TUESDAY).issue).toBe("travel");
    expect(markerFor(FRIDAY).issue).toBe("travel");
  });

  it("leaves a clean day unmarked", () => {
    expect(markerFor(DAYS[6]).issue).toBeNull();
  });

  it("ignores conflicts whose lessons the filters have hidden", () => {
    const onlyMonday = weekLessons.filter((l) => l.date === MONDAY);
    const filtered = buildDayIssueMarkers(DAYS, onlyMonday, conflicts);
    expect(filtered.every((m) => m.issue === null)).toBe(true);
    expect(filtered.find((m) => m.date === THURSDAY)?.count).toBe(0);
  });
});
