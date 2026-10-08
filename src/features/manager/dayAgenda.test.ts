import { describe, expect, it } from "vitest";
import { buildWeekLessons } from "@/data/fixtures/lessons";
import { campuses, classGroups, rooms } from "@/data/fixtures/schools";
import { teachers } from "@/data/fixtures/teachers";
import { detectConflicts, type Conflict } from "@/domain/conflicts";
import { weekDates } from "@/domain/time";
import type { Lesson } from "@/domain/types";
import { getManagerCopy } from "./copy";
import {
  agendaStatusTexts,
  agendaStatuses,
  buildDayAgenda,
  buildTightTravelConnectors,
  programLevelOf,
  resolveDayCues,
  type DayAgendaSources,
} from "./dayAgenda";

const ANCHOR = new Date("2026-10-01T09:00:00");
const DAYS = weekDates(ANCHOR);
const [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, , SUNDAY] = DAYS;
const weekLessons = buildWeekLessons(ANCHOR);
const roomsById = new Map(rooms.map((room) => [room.id, room]));
const groupsById = new Map(classGroups.map((group) => [group.id, group]));
const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
const campusesById = new Map(campuses.map((campus) => [campus.id, campus]));
const teacherIds = teachers.map((teacher) => teacher.id);

const sources: DayAgendaSources = {
  groupCode: (id) => groupsById.get(id)?.code,
  programLevel: (id) => {
    const group = groupsById.get(id);
    return group ? programLevelOf(group.program, group.level) : undefined;
  },
  teacherName: (id) => teachersById.get(id)?.name,
  campusName: (roomId) => {
    const campusId = roomsById.get(roomId)?.campusId;
    return campusId ? campusesById.get(campusId)?.name : undefined;
  },
  roomName: (roomId) => roomsById.get(roomId)?.name,
};

function conflictsFor(lessons: Lesson[]): Map<string, Conflict[]> {
  const map = new Map<string, Conflict[]>();
  for (const conflict of detectConflicts(lessons, roomsById)) {
    for (const id of conflict.lessonIds) {
      const list = map.get(id) ?? [];
      list.push(conflict);
      map.set(id, list);
    }
  }
  return map;
}

const conflictsByLesson = conflictsFor(weekLessons);
const labels = {
  cancelled: "Cancelled",
  noShow: "No-show",
  doubleBooking: "Double booking",
  tightTravel: (gapMin: number) => `Tight travel (${gapMin} min)`,
};

function lesson(over: Partial<Lesson> & Pick<Lesson, "id">): Lesson {
  return {
    date: THURSDAY,
    startMin: 18 * 60,
    endMin: 19 * 60,
    classGroupId: "ot-lp12b01b",
    roomId: "ot-03-205",
    teacherId: "t-leo",
    curriculum: "",
    status: "scheduled",
    ...over,
  };
}

describe("day agenda order", () => {
  it("lists Thursday from the earliest start, across teachers", () => {
    const items = buildDayAgenda(weekLessons, THURSDAY, teacherIds, conflictsByLesson, sources);
    const starts = items.map((item) => item.lesson.startMin);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(items[0].lesson.startMin).toBeLessThan(items.at(-1)!.lesson.startMin);
    expect(new Set(items.map((item) => item.lesson.teacherId)).size).toBeGreaterThan(1);
  });

  it("keeps a longer lesson ahead of a shorter one that starts at the same minute", () => {
    const items = buildDayAgenda(
      [
        lesson({ id: "short", startMin: 600, endMin: 645 }),
        lesson({ id: "long", startMin: 600, endMin: 690 }),
      ],
      THURSDAY,
      ["t-leo"],
      new Map(),
      sources
    );
    expect(items.map((item) => item.lesson.id)).toEqual(["long", "short"]);
  });

  it("leaves each lesson's start and end untouched", () => {
    const source = weekLessons.filter((item) => item.date === MONDAY);
    const items = buildDayAgenda(source, MONDAY, teacherIds, new Map(), sources);
    expect(items.map((item) => [item.lesson.startMin, item.lesson.endMin])).toEqual(
      [...source]
        .sort(
          (a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.id.localeCompare(b.id)
        )
        .map((item) => [item.startMin, item.endMin])
    );
  });
});

describe("day agenda status labels", () => {
  it("gives both of LEO's Thursday lessons a double-booking label", () => {
    const items = buildDayAgenda(weekLessons, THURSDAY, ["t-leo"], conflictsByLesson, sources);
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.teacherName === "Leo Martins")).toBe(true);
    expect(items.map((item) => agendaStatusTexts(item.statuses, labels))).toEqual([
      ["Double booking"],
      ["Double booking"],
    ]);
  });

  it("names MIR's Tuesday hop as tight travel and keeps the group, campus, and room", () => {
    const items = buildDayAgenda(weekLessons, TUESDAY, ["t-mir"], conflictsByLesson, sources);
    expect(items.map((item) => item.statuses)).toEqual([
      [{ kind: "tight-travel", gapMin: 30 }],
      [{ kind: "tight-travel", gapMin: 30 }],
    ]);
    expect(items[0]).toMatchObject({
      groupCode: "LP09A02A",
      programLevel: "Little Pioneers · Primary 9A",
      teacherName: "Mira Novak",
      campusName: "OT03",
      roomName: "201",
    });
  });

  it("keeps double-booking and every tight-travel gap on one scheduled lesson", () => {
    const scheduled = lesson({ id: "both" });
    const conflicts: Conflict[] = [
      { type: "overlap", kind: "teacher", lessonIds: ["both", "other"] },
      { type: "travel", teacherId: "t-leo", lessonIds: ["earlier", "both"], gapMin: 20 },
      { type: "travel", teacherId: "t-leo", lessonIds: ["both", "later"], gapMin: 15 },
    ];
    const statuses = agendaStatuses(scheduled, conflicts);
    expect(agendaStatusTexts(statuses, labels)).toEqual([
      "Double booking",
      "Tight travel (20 min)",
      "Tight travel (15 min)",
    ]);
    const vi = getManagerCopy("vi");
    expect(
      agendaStatusTexts(statuses, {
        cancelled: vi.cancelledCard,
        noShow: vi.noShowCard,
        doubleBooking: vi.doubleBookingCard,
        tightTravel: vi.tightTravelCard,
      })
    ).toEqual(["Trùng lịch", "Di chuyển sát (20 phút)", "Di chuyển sát (15 phút)"]);
  });

  it("does not attach conflict or travel labels to a cancelled lesson", () => {
    const cancelled = weekLessons.find(
      (item) => item.date === WEDNESDAY && item.status === "cancelled"
    );
    expect(cancelled).toBeDefined();
    const statuses = agendaStatuses(cancelled!, [
      { type: "overlap", kind: "teacher", lessonIds: [cancelled!.id, "other"] },
      {
        type: "travel",
        teacherId: cancelled!.teacherId,
        lessonIds: [cancelled!.id, "next"],
        gapMin: 10,
      },
    ]);
    expect(statuses).toEqual([{ kind: "cancelled" }]);
  });

  it("does not attach conflict or travel labels to a no-show", () => {
    const noShow = weekLessons.find((item) => item.date === FRIDAY && item.status === "no-show");
    expect(noShow).toBeDefined();
    const statuses = agendaStatuses(noShow!, [
      { type: "overlap", kind: "room", lessonIds: [noShow!.id, "other"] },
      {
        type: "travel",
        teacherId: noShow!.teacherId,
        lessonIds: ["prev", noShow!.id],
        gapMin: 5,
      },
    ]);
    expect(agendaStatusTexts(statuses, labels)).toEqual(["No-show"]);
  });

  it("leaves a normal Monday lesson without a status", () => {
    const items = buildDayAgenda(weekLessons, MONDAY, teacherIds, conflictsByLesson, sources);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.statuses.length === 0)).toBe(true);
  });
});

describe("day ledger cues", () => {
  const thursday = buildDayAgenda(
    weekLessons,
    THURSDAY,
    teacherIds,
    conflictsByLesson,
    sources
  );

  it("marks the lesson in progress as now and does not also mark a later one next", () => {
    const cues = resolveDayCues(thursday, THURSDAY, THURSDAY, 16 * 60);
    const inProgress = thursday.find((item) => item.groupCode === "STARTERS");
    expect(cues.nowIds).toEqual([inProgress!.lesson.id]);
    expect(cues.nextIds).toEqual([]);
  });

  it("marks every lesson that shares the next start when nothing is underway", () => {
    const cues = resolveDayCues(thursday, THURSDAY, THURSDAY, 17 * 60 + 30);
    const atSix = thursday
      .filter((item) => item.lesson.startMin === 18 * 60)
      .map((item) => item.lesson.id);
    expect(atSix.length).toBeGreaterThan(1);
    expect(cues).toEqual({ nowIds: [], nextIds: atSix });
  });

  it("skips a finished lesson and names the following one", () => {
    const cues = resolveDayCues(thursday, THURSDAY, THURSDAY, 16 * 60 + 20);
    const movers = thursday.find((item) => item.groupCode === "MOVERS");
    expect(cues).toEqual({ nowIds: [], nextIds: [movers!.lesson.id] });
  });

  it("does not treat a cancelled or no-show lesson as now or next", () => {
    const rows = [
      lesson({ id: "off", status: "cancelled", startMin: 600, endMin: 660 }),
      lesson({ id: "missed", status: "no-show", startMin: 600, endMin: 660 }),
      lesson({ id: "later", startMin: 720, endMin: 780 }),
    ].map((entry) => ({ lesson: entry }));
    expect(resolveDayCues(rows, THURSDAY, THURSDAY, 630)).toEqual({
      nowIds: [],
      nextIds: ["later"],
    });
  });

  it("stays quiet on another date and when the clock is unknown", () => {
    expect(resolveDayCues(thursday, THURSDAY, MONDAY, 16 * 60)).toEqual({
      nowIds: [],
      nextIds: [],
    });
    expect(resolveDayCues(thursday, THURSDAY, THURSDAY, null)).toEqual({
      nowIds: [],
      nextIds: [],
    });
  });
});

describe("tight travel connectors", () => {
  it("places MIR's Tuesday hop in front of the later lesson", () => {
    const items = buildDayAgenda(weekLessons, TUESDAY, ["t-mir"], conflictsByLesson, sources);
    expect(buildTightTravelConnectors(items, conflictsByLesson)).toEqual([
      {
        beforeLessonId: items[1].lesson.id,
        fromLessonId: items[0].lesson.id,
        gapMin: 30,
        fromCampus: "OT03",
        toCampus: "OT17",
      },
    ]);
  });

  it("places MIR's Friday return hop the same way", () => {
    const items = buildDayAgenda(weekLessons, FRIDAY, ["t-mir"], conflictsByLesson, sources);
    const hops = buildTightTravelConnectors(items, conflictsByLesson);
    expect(hops).toHaveLength(1);
    expect(hops[0]).toMatchObject({ gapMin: 20, fromCampus: "OT17", toCampus: "OT03" });
    expect(hops[0].beforeLessonId).toBe(items[1].lesson.id);
  });

  it("draws nothing for a calm Monday, a same-campus gap, or a gap of 45 minutes", () => {
    const monday = buildDayAgenda(weekLessons, MONDAY, teacherIds, conflictsByLesson, sources);
    expect(buildTightTravelConnectors(monday, conflictsByLesson)).toEqual([]);

    const sameCampus = [
      lesson({ id: "a", teacherId: "t-mir", roomId: "ot-03-201", startMin: 17 * 60, endMin: 18 * 60 }),
      lesson({ id: "b", teacherId: "t-mir", roomId: "ot-03-205", startMin: 18 * 60 + 10, endMin: 19 * 60 }),
    ];
    const enoughTime = [
      lesson({ id: "c", teacherId: "t-mir", roomId: "ot-03-201", startMin: 17 * 60, endMin: 18 * 60 }),
      lesson({ id: "d", teacherId: "t-mir", roomId: "ot-17-103", startMin: 18 * 60 + 45, endMin: 19 * 60 + 45 }),
    ];
    for (const pair of [sameCampus, enoughTime]) {
      const found = conflictsFor(pair);
      const items = buildDayAgenda(pair, THURSDAY, ["t-mir"], found, sources);
      expect(buildTightTravelConnectors(items, found)).toEqual([]);
    }
  });

  it("does not connect a lesson that is cancelled or filtered out", () => {
    const items = buildDayAgenda(weekLessons, TUESDAY, ["t-mir"], conflictsByLesson, sources);
    const firstOnly = items.slice(0, 1);
    expect(buildTightTravelConnectors(firstOnly, conflictsByLesson)).toEqual([]);

    const cancelled = {
      ...items[0],
      lesson: { ...items[0].lesson, status: "cancelled" as const },
    };
    expect(buildTightTravelConnectors([cancelled, items[1]], conflictsByLesson)).toEqual([]);
  });
});

describe("day ledger emptiness", () => {
  it("returns no rows when the day has no lesson for the selected teachers", () => {
    expect(
      buildDayAgenda(weekLessons, SUNDAY, ["t-mir"], conflictsByLesson, sources)
    ).toEqual([]);
    expect(buildDayAgenda(weekLessons, THURSDAY, [], conflictsByLesson, sources)).toEqual([]);
  });
});
