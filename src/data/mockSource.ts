"use client";

import type { DataSource } from "./source";
import { useClassFlowStore } from "./store";

/**
 * Mock DataSource backed by the in-memory store. A real backend replaces
 * this file (and makes the interface async) — nothing else changes.
 */
export const mockDataSource: DataSource = {
  listSchools: () => useClassFlowStore.getState().schools,
  listCampuses: () => useClassFlowStore.getState().campuses,
  listRooms: () => useClassFlowStore.getState().rooms,
  listTeachers: () => useClassFlowStore.getState().teachers,
  listClassGroups: () => useClassFlowStore.getState().classGroups,
  listLessons: () => useClassFlowStore.getState().lessons,
  getFxRate: () => useClassFlowStore.getState().fxRate,

  createLesson: (input) => useClassFlowStore.getState().createLesson(input),
  updateLesson: (id, patch) => useClassFlowStore.getState().updateLesson(id, patch),
  setLessonStatus: (id, status) => useClassFlowStore.getState().setLessonStatus(id, status),
  rescheduleLesson: (id, date, startMin, endMin) =>
    useClassFlowStore.getState().rescheduleLesson(id, date, startMin, endMin),
  importLessons: (inputs) => useClassFlowStore.getState().importLessons(inputs),
};
