import type { Lesson, LessonInput, LessonStatus } from "@/domain/types";
import type { DataSource } from "./source";
import { campuses, classGroups, rooms, schools } from "./fixtures/schools";
import { captureFxRate, teachers } from "./fixtures/teachers";
import { buildDemoLessons } from "./fixtures/lessons";
import { toIsoDate } from "@/domain/time";

/**
 * A fake backend, entirely in memory, implementing the same DataSource the
 * HTTP client implements. It exists for the fixture demo only: set
 * `NEXT_PUBLIC_DATA_SOURCE=mock` to get a browsable schedule with no server
 * and no database. A guest demo visit can also bind this source explicitly.
 * Everything it holds is lost on reload.
 *
 * The real product path is `httpSource.ts`. A failed API call never selects
 * this source on its own.
 */
export function createMockSource(seedDate = new Date()): DataSource {
  const today = toIsoDate(seedDate);
  let lessons = buildDemoLessons(seedDate);
  let sequence = 0;

  const nextId = () => `ls-mock-${++sequence}`;

  const find = (id: string): Lesson => {
    const lesson = lessons.find((l) => l.id === id);
    if (!lesson) throw new Error(`Lesson not found: ${id}`);
    return lesson;
  };

  const replace = (id: string, patch: Partial<Lesson>): Lesson => {
    const updated = { ...find(id), ...patch };
    lessons = lessons.map((l) => (l.id === id ? updated : l));
    return updated;
  };

  return {
    listSchools: async () => schools,
    listCampuses: async () => campuses,
    listRooms: async () => rooms,
    listTeachers: async () => teachers,
    listClassGroups: async () => classGroups,
    listLessons: async () => lessons,
    getFxRate: async () => captureFxRate(today),

    createLesson: async (input: LessonInput) => {
      const lesson: Lesson = { ...input, id: nextId() };
      lessons = [...lessons, lesson];
      return lesson;
    },

    updateLesson: async (id: string, patch: Partial<LessonInput>) =>
      replace(id, patch),

    setLessonStatus: async (id: string, status: LessonStatus) =>
      replace(id, { status }),

    rescheduleLesson: async (
      id: string,
      date: string,
      startMin: number,
      endMin: number
    ) => {
      const before = find(id);
      // The origin a move is measured from: the first one, not the latest hop.
      const movedFrom =
        before.movedFrom ?? { date: before.date, startMin: before.startMin };
      return replace(id, { date, startMin, endMin, movedFrom });
    },

    deleteLesson: async (id: string) => {
      find(id);
      lessons = lessons.filter((l) => l.id !== id);
    },

    importLessons: async (inputs: LessonInput[]) => {
      const created = inputs.map((input): Lesson => ({ ...input, id: nextId() }));
      lessons = [...lessons, ...created];
      return created;
    },
  };
}
