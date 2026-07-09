/**
 * Canonical domain model. Every school's source format is normalized into
 * these shapes; the Lesson is the atomic unit everything else derives from.
 */

export type TeacherCategory = "native" | "non-native" | "esl";

export type LessonStatus = "scheduled" | "cancelled" | "no-show";

/** Named color tokens; each school gets one, mapped to CSS in the UI layer. */
export type SchoolColor = "teal" | "amber" | "plum" | "moss";

export interface School {
  id: string;
  name: string;
  shortName: string;
  district: string;
  color: SchoolColor;
  /** Whether this school staffs a local class manager (CM) in lessons. */
  hasClassManagers: boolean;
}

export interface Campus {
  id: string;
  schoolId: string;
  name: string;
  address: string;
}

export interface Room {
  id: string;
  campusId: string;
  /** As the school names it: "205", "Ocean (203)", "P.201" — never normalized away. */
  name: string;
}

export interface Teacher {
  id: string;
  /** Short code used in schedules, e.g. "DAV". */
  code: string;
  name: string;
  category: TeacherCategory;
  /** Fixed hourly rate in USD; the same at every school. VND is always derived. */
  usdRate: number;
}

export interface ClassGroup {
  id: string;
  schoolId: string;
  /** School-specific code grammar: "LP12B01B", "FLYERS", "IL401", "4A1". */
  code: string;
  program: string;
  level: string;
}

export interface Lesson {
  id: string;
  /** ISO date, yyyy-MM-dd. */
  date: string;
  /** Minutes from midnight. Duration is derived; it is arbitrary, never a fixed slot. */
  startMin: number;
  endMin: number;
  classGroupId: string;
  roomId: string;
  teacherId: string;
  /** Local Vietnamese co-teacher; present at some schools, absent at others. */
  cmName?: string;
  /** Free-form structured text: coursebook+pages, exam ref, or just a skill. */
  curriculum: string;
  /** Optional syllabus locator used by some schools: "W6D1", "D7". */
  weekCode?: string;
  /** Scheduled lessons are assumed delivered. Only exceptions are marked. */
  status: LessonStatus;
  /** Set when the lesson was rescheduled, so the move stays visible. */
  movedFrom?: { date: string; startMin: number };
}

export type LessonInput = Omit<Lesson, "id">;

export interface FxRate {
  vndPerUsd: number;
  /** ISO date the spot rate was captured. */
  capturedOn: string;
  source: string;
}

/** Duration in hours — the unit pay is computed in. */
export function lessonHours(lesson: Pick<Lesson, "startMin" | "endMin">): number {
  return (lesson.endMin - lesson.startMin) / 60;
}

/** A lesson counts toward pay unless it was cancelled or a no-show. */
export function isPayable(lesson: Pick<Lesson, "status">): boolean {
  return lesson.status === "scheduled";
}
