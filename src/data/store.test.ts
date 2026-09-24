import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClassFlowStore } from "./store";
import type { DataSource } from "./source";
import type { FxRate, Lesson, LessonInput, LessonStatus } from "@/domain/types";
import { teachers } from "./fixtures/teachers";
import { campuses, classGroups, rooms, schools } from "./fixtures/schools";

/**
 * The store is a cache of server state. What matters here is that it only ever
 * shows what a mutation actually returned, and that a failure leaves the
 * previous state alone — that is what makes the screen agree with the database
 * after a refresh.
 */

const FX: FxRate = {
  vndPerUsd: 26150,
  capturedOn: "2026-09-15",
  source: "Vietcombank spot",
};

const LESSON_INPUT: LessonInput = {
  date: "2026-09-14",
  startMin: 1080,
  endMin: 1140,
  classGroupId: "ot-lp12b01b",
  roomId: "ot-03-205",
  teacherId: "t-dav", // 22 USD/hour
  curriculum: "Prepare 5",
  status: "scheduled",
};

const STORED: Lesson = { ...LESSON_INPUT, id: "ls-1" };

/** A DataSource whose every method is a spy, so calls can be asserted. */
function fakeSource(overrides: Partial<DataSource> = {}) {
  const source: DataSource = {
    listSchools: vi.fn(async () => schools),
    listCampuses: vi.fn(async () => campuses),
    listRooms: vi.fn(async () => rooms),
    listTeachers: vi.fn(async () => teachers),
    listClassGroups: vi.fn(async () => classGroups),
    listLessons: vi.fn(async () => [] as Lesson[]),
    getFxRate: vi.fn(async () => FX),
    createLesson: vi.fn(async (input: LessonInput) => ({ ...input, id: "ls-new" })),
    updateLesson: vi.fn(async (id: string, patch: Partial<LessonInput>) => ({
      ...STORED,
      ...patch,
      id,
    })),
    setLessonStatus: vi.fn(async (id: string, status: LessonStatus) => ({
      ...STORED,
      id,
      status,
    })),
    rescheduleLesson: vi.fn(async (id: string, date: string, startMin: number, endMin: number) => ({
      ...STORED,
      id,
      date,
      startMin,
      endMin,
      movedFrom: { date: STORED.date, startMin: STORED.startMin },
    })),
    deleteLesson: vi.fn(async () => {}),
    importLessons: vi.fn(async (inputs: LessonInput[]) =>
      inputs.map((input, i) => ({ ...input, id: `ls-import-${i}` }))
    ),
    ...overrides,
  };
  return source;
}

async function readyStore(overrides: Partial<DataSource> = {}) {
  const source = fakeSource(overrides);
  const store = createClassFlowStore(source);
  await store.getState().load();
  return { store, source };
}

describe("initial load", () => {
  it("starts idle and empty, with nothing invented", () => {
    const store = createClassFlowStore(fakeSource());
    expect(store.getState().status).toBe("idle");
    expect(store.getState().lessons).toEqual([]);
  });

  it("fills the cache from the source and reports ready", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    const state = store.getState();
    expect(state.status).toBe("ready");
    expect(state.lessons).toEqual([STORED]);
    expect(state.teachers).toEqual(teachers);
    expect(state.fxRate).toEqual(FX);
    expect(state.loadError).toBeNull();
  });

  it("requests every resource in one pass", async () => {
    const { source } = await readyStore();
    expect(source.listSchools).toHaveBeenCalledTimes(1);
    expect(source.listLessons).toHaveBeenCalledTimes(1);
    expect(source.getFxRate).toHaveBeenCalledTimes(1);
  });

  it("an empty schedule is a valid ready state, not an error", async () => {
    const { store } = await readyStore({ listLessons: vi.fn(async () => []) });
    expect(store.getState().status).toBe("ready");
    expect(store.getState().lessons).toEqual([]);
  });

  it("reports an error and no lessons when the backend is unreachable", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => {
        throw new Error("API unreachable");
      }),
    });
    const state = store.getState();
    expect(state.status).toBe("error");
    expect(state.loadError).toBe("API unreachable");
    // The critical guarantee: a failed load never shows fixture lessons.
    expect(state.lessons).toEqual([]);
  });

  it("can be retried after a failure", async () => {
    let attempt = 0;
    const listLessons = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("boom");
      return [STORED];
    });
    const store = createClassFlowStore(fakeSource({ listLessons }));
    await store.getState().load();
    expect(store.getState().status).toBe("error");
    await store.getState().load();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().lessons).toEqual([STORED]);
  });
});

describe("create", () => {
  it("adds the lesson the backend returned, not the one submitted", async () => {
    const { store } = await readyStore();
    const created = await store.getState().createLesson(LESSON_INPUT);
    expect(created.id).toBe("ls-new");
    expect(store.getState().lessons).toEqual([created]);
  });

  it("emits the pay the new lesson adds", async () => {
    const { store } = await readyStore();
    await store.getState().createLesson(LESSON_INPUT);
    // One hour at 22 USD.
    expect(store.getState().lastPayEffect?.deltaUsd).toBe(22);
    expect(store.getState().lastPayEffect?.teacherId).toBe("t-dav");
  });

  it("leaves the schedule untouched when the backend refuses", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
      createLesson: vi.fn(async () => {
        throw new Error("Room does not exist.");
      }),
    });
    await expect(store.getState().createLesson(LESSON_INPUT)).rejects.toThrow(
      "Room does not exist."
    );
    expect(store.getState().lessons).toEqual([STORED]);
    expect(store.getState().mutationError).toBe("Room does not exist.");
  });
});

describe("edit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends only the patch when neither day nor start time changed", async () => {
    const { store, source } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().editLesson("ls-1", { curriculum: "Changed" });
    expect(source.updateLesson).toHaveBeenCalledWith("ls-1", {
      curriculum: "Changed",
    });
  });

  it("records the move origin when the day changes", async () => {
    const { store, source } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().editLesson("ls-1", { date: "2026-09-16" });
    expect(source.updateLesson).toHaveBeenCalledWith("ls-1", {
      date: "2026-09-16",
      movedFrom: { date: "2026-09-14", startMin: 1080 },
    });
  });

  it("records the move origin when the start time changes", async () => {
    const { store, source } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().editLesson("ls-1", { startMin: 1110 });
    expect(source.updateLesson).toHaveBeenCalledWith("ls-1", {
      startMin: 1110,
      movedFrom: { date: "2026-09-14", startMin: 1080 },
    });
  });

  it("keeps the first origin when an already-moved lesson is edited", async () => {
    const alreadyMoved: Lesson = {
      ...STORED,
      movedFrom: { date: "2026-09-10", startMin: 900 },
    };
    const { store, source } = await readyStore({
      listLessons: vi.fn(async () => [alreadyMoved]),
    });
    await store.getState().editLesson("ls-1", { date: "2026-09-18" });
    expect(source.updateLesson).toHaveBeenCalledWith("ls-1", {
      date: "2026-09-18",
      movedFrom: { date: "2026-09-10", startMin: 900 },
    });
  });

  it("does not treat an unchanged date as a move", async () => {
    const { store, source } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().editLesson("ls-1", { date: STORED.date, curriculum: "x" });
    expect(source.updateLesson).toHaveBeenCalledWith("ls-1", {
      date: STORED.date,
      curriculum: "x",
    });
  });
});

describe("status", () => {
  it("replaces the cached lesson with the stored one", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().setLessonStatus("ls-1", "cancelled");
    expect(store.getState().lessons[0].status).toBe("cancelled");
  });

  it("keeps a cancelled lesson on the schedule", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().setLessonStatus("ls-1", "cancelled");
    expect(store.getState().lessons).toHaveLength(1);
  });

  it("removes the pay a cancellation costs", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().setLessonStatus("ls-1", "cancelled");
    expect(store.getState().lastPayEffect?.deltaUsd).toBe(-22);
  });

  it("leaves the status alone when the backend refuses", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
      setLessonStatus: vi.fn(async () => {
        throw new Error("Lesson not found.");
      }),
    });
    await expect(
      store.getState().setLessonStatus("ls-1", "cancelled")
    ).rejects.toThrow();
    expect(store.getState().lessons[0].status).toBe("scheduled");
  });
});

describe("reschedule", () => {
  it("takes the resulting lesson, including movedFrom, from the response", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().rescheduleLesson("ls-1", "2026-09-16", 1110, 1170);
    const lesson = store.getState().lessons[0];
    expect(lesson.date).toBe("2026-09-16");
    expect(lesson.startMin).toBe(1110);
    expect(lesson.movedFrom).toEqual({ date: "2026-09-14", startMin: 1080 });
  });

  it("leaves the lesson where it was when the move is refused", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
      rescheduleLesson: vi.fn(async () => {
        throw new Error("Lesson not found.");
      }),
    });
    await expect(
      store.getState().rescheduleLesson("ls-1", "2026-09-16", 1110, 1170)
    ).rejects.toThrow();
    expect(store.getState().lessons[0].date).toBe("2026-09-14");
    expect(store.getState().lessons[0].startMin).toBe(1080);
  });
});

describe("delete", () => {
  it("removes the lesson once the backend confirms", async () => {
    const { store, source } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().deleteLesson("ls-1");
    expect(source.deleteLesson).toHaveBeenCalledWith("ls-1");
    expect(store.getState().lessons).toEqual([]);
  });

  it("removes only the target", async () => {
    const other: Lesson = { ...STORED, id: "ls-2" };
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED, other]),
    });
    await store.getState().deleteLesson("ls-1");
    expect(store.getState().lessons.map((l) => l.id)).toEqual(["ls-2"]);
  });

  it("removes the pay the lesson earned", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
    });
    await store.getState().deleteLesson("ls-1");
    expect(store.getState().lastPayEffect?.deltaUsd).toBe(-22);
  });

  it("keeps the lesson visible when the delete fails", async () => {
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [STORED]),
      deleteLesson: vi.fn(async () => {
        throw new Error("Lesson not found.");
      }),
    });
    await expect(store.getState().deleteLesson("ls-1")).rejects.toThrow();
    expect(store.getState().lessons).toEqual([STORED]);
    expect(store.getState().mutationError).toBe("Lesson not found.");
  });

  it("does not charge pay for deleting a cancelled lesson", async () => {
    const cancelled: Lesson = { ...STORED, status: "cancelled" };
    const { store } = await readyStore({
      listLessons: vi.fn(async () => [cancelled]),
    });
    await store.getState().deleteLesson("ls-1");
    expect(store.getState().lastPayEffect).toBeNull();
  });
});

describe("import", () => {
  it("appends every lesson the backend created", async () => {
    const { store } = await readyStore();
    await store.getState().importLessons([LESSON_INPUT, LESSON_INPUT]);
    expect(store.getState().lessons.map((l) => l.id)).toEqual([
      "ls-import-0",
      "ls-import-1",
    ]);
  });

  it("adds nothing when the batch is rejected", async () => {
    const { store } = await readyStore({
      importLessons: vi.fn(async () => {
        throw new Error("Row 2 is invalid.");
      }),
    });
    await expect(
      store.getState().importLessons([LESSON_INPUT])
    ).rejects.toThrow();
    expect(store.getState().lessons).toEqual([]);
  });
});

describe("mutation errors", () => {
  it("clears on request", async () => {
    const { store } = await readyStore({
      createLesson: vi.fn(async () => {
        throw new Error("nope");
      }),
    });
    await store.getState().createLesson(LESSON_INPUT).catch(() => {});
    expect(store.getState().mutationError).toBe("nope");
    store.getState().clearMutationError();
    expect(store.getState().mutationError).toBeNull();
  });

  it("clears when a later mutation succeeds", async () => {
    let fail = true;
    const { store } = await readyStore({
      createLesson: vi.fn(async (input: LessonInput) => {
        if (fail) {
          fail = false;
          throw new Error("nope");
        }
        return { ...input, id: "ls-new" };
      }),
    });
    await store.getState().createLesson(LESSON_INPUT).catch(() => {});
    expect(store.getState().mutationError).toBe("nope");
    await store.getState().createLesson(LESSON_INPUT);
    expect(store.getState().mutationError).toBeNull();
  });
});
