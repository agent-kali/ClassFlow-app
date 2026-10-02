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
  programLevelOf,
  type DayAgendaSources,
} from "./dayAgenda";

const ANCHOR = new Date("2026-10-01T09:00:00");
const DAYS = weekDates(ANCHOR);
const [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY] = DAYS;
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
