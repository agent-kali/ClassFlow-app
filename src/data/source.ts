import type {
  Campus,
  ClassGroup,
  FxRate,
  Lesson,
  LessonInput,
  LessonStatus,
  Room,
  School,
  Teacher,
} from "@/domain/types";

/**
 * The seam for the future backend. Components never touch fixtures or the
 * store's internals — they go through hooks that delegate to a DataSource.
 * Replacing the mock with a real API means reimplementing this interface
 * (methods become async) without touching the UI.
 */
export interface DataSource {
  listSchools(): School[];
  listCampuses(): Campus[];
  listRooms(): Room[];
  listTeachers(): Teacher[];
  listClassGroups(): ClassGroup[];
  listLessons(): Lesson[];
  getFxRate(): FxRate;

  createLesson(input: LessonInput): Lesson;
  updateLesson(id: string, patch: Partial<LessonInput>): void;
  setLessonStatus(id: string, status: LessonStatus): void;
  rescheduleLesson(id: string, date: string, startMin: number, endMin: number): void;
  importLessons(inputs: LessonInput[]): Lesson[];
}
