"use client";

import { useMemo, useState } from "react";
import type { Lesson } from "@/domain/types";
import type { useLookups } from "@/data/hooks";

/**
 * View narrowing. Empty sets mean "everything" — the manager starts from
 * the full week and subtracts, which matches how they actually scan it.
 */
export interface ScheduleFilters {
  schoolIds: Set<string>;
  campusIds: Set<string>;
  teacherIds: Set<string>;
}

export function useScheduleFilters() {
  const [filters, setFilters] = useState<ScheduleFilters>({
    schoolIds: new Set(),
    campusIds: new Set(),
    teacherIds: new Set(),
  });

  const toggle = (key: keyof ScheduleFilters, id: string) => {
    setFilters((f) => {
      const next = new Set(f[key]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...f, [key]: next };
    });
  };

  const clear = () =>
    setFilters({ schoolIds: new Set(), campusIds: new Set(), teacherIds: new Set() });

  const isActive =
    filters.schoolIds.size > 0 || filters.campusIds.size > 0 || filters.teacherIds.size > 0;

  return { filters, toggle, clear, isActive };
}

export function useFilteredLessons(
  lessons: Lesson[],
  filters: ScheduleFilters,
  lookups: ReturnType<typeof useLookups>
): Lesson[] {
  return useMemo(() => {
    const { schoolIds, campusIds, teacherIds } = filters;
    if (schoolIds.size === 0 && campusIds.size === 0 && teacherIds.size === 0) {
      return lessons;
    }
    return lessons.filter((l) => {
      if (teacherIds.size > 0 && !teacherIds.has(l.teacherId)) return false;
      const campus = lookups.campusOfRoom(l.roomId);
      if (campusIds.size > 0 && (!campus || !campusIds.has(campus.id))) return false;
      if (schoolIds.size > 0 && (!campus || !schoolIds.has(campus.schoolId))) return false;
      return true;
    });
  }, [lessons, filters, lookups]);
}
