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
 * The boundary to the backend. Components never touch a fixture or a fetch
 * call — they go through hooks that read a store, and the store is the only
 * thing that talks to a DataSource.
 *
 * Every method is async because the real implementation is HTTP
 * (`httpSource.ts`). `mockSource.ts` implements the same interface in memory
 * for the fixture demo.
 *
 * Mutations resolve to the stored lesson rather than void: `rescheduleLesson`
 * derives `movedFrom` on the server, so the response is the only thing that
 * knows the resulting state without refetching the whole schedule.
 */
export interface DataSource {
  listSchools(): Promise<School[]>;
  listCampuses(): Promise<Campus[]>;
  listRooms(): Promise<Room[]>;
  listTeachers(): Promise<Teacher[]>;
  listClassGroups(): Promise<ClassGroup[]>;
  listLessons(): Promise<Lesson[]>;
  getFxRate(): Promise<FxRate>;

  createLesson(input: LessonInput): Promise<Lesson>;
  updateLesson(id: string, patch: Partial<LessonInput>): Promise<Lesson>;
  setLessonStatus(id: string, status: LessonStatus): Promise<Lesson>;
  rescheduleLesson(
    id: string,
    date: string,
    startMin: number,
    endMin: number
  ): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  importLessons(inputs: LessonInput[]): Promise<Lesson[]>;
}

/** Everything the schedule needs before it can render. */
export interface ScheduleSnapshot {
  schools: School[];
  campuses: Campus[];
  rooms: Room[];
  teachers: Teacher[];
  classGroups: ClassGroup[];
  lessons: Lesson[];
  fxRate: FxRate;
}

/** One parallel round trip for the whole schedule. */
export async function loadSchedule(source: DataSource): Promise<ScheduleSnapshot> {
  const [schools, campuses, rooms, teachers, classGroups, lessons, fxRate] =
    await Promise.all([
      source.listSchools(),
      source.listCampuses(),
      source.listRooms(),
      source.listTeachers(),
      source.listClassGroups(),
      source.listLessons(),
      source.getFxRate(),
    ]);
  return { schools, campuses, rooms, teachers, classGroups, lessons, fxRate };
}
