"use client";

import { useMemo } from "react";
import { useClassFlowStore, type PayEffect } from "./store";
import type { Campus, ClassGroup, Room, School, Teacher } from "@/domain/types";
import { earningsFor, type Earnings, type Instant } from "@/domain/earnings";
import { detectConflicts, conflictsByLesson, type Conflict } from "@/domain/conflicts";

/**
 * The only door components use into the data layer. Everything here reads
 * the shared store; swapping in a real backend replaces the store's guts,
 * not these signatures.
 */

export function useSchools() {
  return useClassFlowStore((s) => s.schools);
}
export function useCampuses() {
  return useClassFlowStore((s) => s.campuses);
}
export function useRooms() {
  return useClassFlowStore((s) => s.rooms);
}
export function useTeachers() {
  return useClassFlowStore((s) => s.teachers);
}
export function useClassGroups() {
  return useClassFlowStore((s) => s.classGroups);
}
export function useLessons() {
  return useClassFlowStore((s) => s.lessons);
}
export function useFxRate() {
  return useClassFlowStore((s) => s.fxRate);
}
export function useToday() {
  return useClassFlowStore((s) => s.today);
}
export function useLastPayEffect(): PayEffect | null {
  return useClassFlowStore((s) => s.lastPayEffect);
}

export function useLessonMutations() {
  const createLesson = useClassFlowStore((s) => s.createLesson);
  const updateLesson = useClassFlowStore((s) => s.updateLesson);
  const editLesson = useClassFlowStore((s) => s.editLesson);
  const setLessonStatus = useClassFlowStore((s) => s.setLessonStatus);
  const rescheduleLesson = useClassFlowStore((s) => s.rescheduleLesson);
  const importLessons = useClassFlowStore((s) => s.importLessons);
  return {
    createLesson,
    updateLesson,
    editLesson,
    setLessonStatus,
    rescheduleLesson,
    importLessons,
  };
}

/** Joined lookup maps, memoized against the underlying lists. */
export function useLookups() {
  const schools = useSchools();
  const campuses = useCampuses();
  const rooms = useRooms();
  const teachers = useTeachers();
  const classGroups = useClassGroups();

  return useMemo(() => {
    const schoolsById = new Map<string, School>(schools.map((x) => [x.id, x]));
    const campusesById = new Map<string, Campus>(campuses.map((x) => [x.id, x]));
    const roomsById = new Map<string, Room>(rooms.map((x) => [x.id, x]));
    const teachersById = new Map<string, Teacher>(teachers.map((x) => [x.id, x]));
    const classGroupsById = new Map<string, ClassGroup>(classGroups.map((x) => [x.id, x]));

    const campusOfRoom = (roomId: string): Campus | undefined => {
      const room = roomsById.get(roomId);
      return room ? campusesById.get(room.campusId) : undefined;
    };
    const schoolOfRoom = (roomId: string): School | undefined => {
      const campus = campusOfRoom(roomId);
      return campus ? schoolsById.get(campus.schoolId) : undefined;
    };

    return {
      schoolsById,
      campusesById,
      roomsById,
      teachersById,
      classGroupsById,
      campusOfRoom,
      schoolOfRoom,
    };
  }, [schools, campuses, rooms, teachers, classGroups]);
}

const EMPTY_EARNINGS: Earnings = {
  hours: 0,
  usd: 0,
  lessonCount: 0,
  excludedCount: 0,
  earnedHours: 0,
  earnedUsd: 0,
  earnedCount: 0,
};

export function useEarnings(
  teacher: Teacher | undefined,
  range: { from: string; to: string },
  asOf: Instant
): Earnings {
  const lessons = useLessons();
  return useMemo(
    () => (teacher ? earningsFor(teacher, lessons, range, asOf) : EMPTY_EARNINGS),
    [teacher, lessons, range, asOf]
  );
}

export function useConflicts(): { conflicts: Conflict[]; byLesson: Map<string, Conflict[]> } {
  const lessons = useLessons();
  const { roomsById } = useLookups();
  return useMemo(() => {
    const conflicts = detectConflicts(lessons, roomsById);
    return { conflicts, byLesson: conflictsByLesson(conflicts) };
  }, [lessons, roomsById]);
}
