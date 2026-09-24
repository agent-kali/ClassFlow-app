import { describe, expect, it } from "vitest";
import { ApiError, createHttpSource } from "./httpSource";
import type { LessonInput } from "@/domain/types";

/**
 * These pin the wire behaviour in docs/api-contract.md: the method, path and
 * body sent for each DataSource call, and how a contract error body becomes
 * something the UI can show.
 */

interface Call {
  url: string;
  method: string;
  body: unknown;
  contentType: string | undefined;
}

function recorder(
  respond: (call: Call) => { status?: number; body?: unknown } = () => ({})
) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      contentType: (init?.headers as Record<string, string> | undefined)?.[
        "Content-Type"
      ],
    };
    calls.push(call);
    const { status = 200, body = null } = respond(call);
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, source: createHttpSource({ fetchImpl, baseUrl: "/api" }) };
}

const LESSON: LessonInput = {
  date: "2026-09-14",
  startMin: 1080,
  endMin: 1140,
  classGroupId: "ot-lp12b01b",
  roomId: "ot-03-205",
  teacherId: "t-dav",
  curriculum: "Prepare 5",
  status: "scheduled",
};

describe("transport", () => {
  it("sends the session cookie only to the same origin", async () => {
    let credentials: RequestCredentials | undefined;
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      credentials = init?.credentials;
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    const source = createHttpSource({ fetchImpl, baseUrl: "/api" });
    await source.listLessons();
    expect(credentials).toBe("same-origin");
  });
});

describe("read methods", () => {
  it.each([
    ["listSchools", "/api/schools"],
    ["listCampuses", "/api/campuses"],
    ["listRooms", "/api/rooms"],
    ["listTeachers", "/api/teachers"],
    ["listClassGroups", "/api/class-groups"],
    ["listLessons", "/api/lessons"],
    ["getFxRate", "/api/fx-rate"],
  ] as const)("%s issues GET %s", async (method, url) => {
    const { calls, source } = recorder(() => ({ body: [] }));
    await source[method]();
    expect(calls).toEqual([
      { url, method: "GET", body: undefined, contentType: undefined },
    ]);
  });

  it("returns the parsed collection", async () => {
    const { source } = recorder(() => ({ body: [{ id: "ot" }] }));
    await expect(source.listSchools()).resolves.toEqual([{ id: "ot" }]);
  });

  it("treats an empty collection as a valid answer", async () => {
    const { source } = recorder(() => ({ body: [] }));
    await expect(source.listLessons()).resolves.toEqual([]);
  });
});

describe("mutations", () => {
  it("creates with POST /lessons and returns the stored lesson", async () => {
    const { calls, source } = recorder(() => ({
      status: 201,
      body: { ...LESSON, id: "ls-1" },
    }));
    const created = await source.createLesson(LESSON);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toBe("/api/lessons");
    expect(calls[0].body).toEqual(LESSON);
    expect(calls[0].contentType).toBe("application/json");
    expect(created.id).toBe("ls-1");
  });

  it("omits absent optional fields rather than sending null", async () => {
    const { calls, source } = recorder(() => ({ status: 201, body: {} }));
    await source.createLesson({ ...LESSON, cmName: undefined, weekCode: undefined });
    expect(calls[0].body).not.toHaveProperty("cmName");
    expect(calls[0].body).not.toHaveProperty("weekCode");
  });

  it("patches with PATCH /lessons/{id}", async () => {
    const { calls, source } = recorder(() => ({ body: { id: "ls-1" } }));
    await source.updateLesson("ls-1", { curriculum: "Changed" });
    expect(calls[0].method).toBe("PATCH");
    expect(calls[0].url).toBe("/api/lessons/ls-1");
    expect(calls[0].body).toEqual({ curriculum: "Changed" });
  });

  it("sets status with PATCH /lessons/{id}/status", async () => {
    const { calls, source } = recorder(() => ({ body: { id: "ls-1" } }));
    await source.setLessonStatus("ls-1", "cancelled");
    expect(calls[0].url).toBe("/api/lessons/ls-1/status");
    expect(calls[0].body).toEqual({ status: "cancelled" });
  });

  it("reschedules with PATCH /lessons/{id}/reschedule", async () => {
    const { calls, source } = recorder(() => ({ body: { id: "ls-1" } }));
    await source.rescheduleLesson("ls-1", "2026-09-16", 600, 660);
    expect(calls[0].url).toBe("/api/lessons/ls-1/reschedule");
    expect(calls[0].body).toEqual({ date: "2026-09-16", startMin: 600, endMin: 660 });
  });

  it("returns the server's movedFrom rather than deriving one", async () => {
    const movedFrom = { date: "2026-09-14", startMin: 1080 };
    const { source } = recorder(() => ({ body: { ...LESSON, id: "ls-1", movedFrom } }));
    const moved = await source.rescheduleLesson("ls-1", "2026-09-16", 600, 660);
    expect(moved.movedFrom).toEqual(movedFrom);
  });

  it("deletes with DELETE /lessons/{id} and expects no body", async () => {
    const { calls, source } = recorder(() => ({ status: 204 }));
    await expect(source.deleteLesson("ls-1")).resolves.toBeUndefined();
    expect(calls[0]).toEqual({
      url: "/api/lessons/ls-1",
      method: "DELETE",
      body: undefined,
      contentType: undefined,
    });
  });

  it("imports a batch with POST /lessons/import", async () => {
    const { calls, source } = recorder(() => ({ status: 201, body: [] }));
    await source.importLessons([LESSON, LESSON]);
    expect(calls[0].url).toBe("/api/lessons/import");
    expect(calls[0].body).toEqual([LESSON, LESSON]);
  });

  it("escapes ids so an odd id cannot alter the path", async () => {
    const { calls, source } = recorder(() => ({ status: 204 }));
    await source.deleteLesson("ls/1 2");
    expect(calls[0].url).toBe("/api/lessons/ls%2F1%202");
  });
});

describe("errors", () => {
  it("raises the contract message on 404", async () => {
    const { source } = recorder(() => ({
      status: 404,
      body: {
        status: 404,
        code: "not_found",
        message: "Lesson not found.",
        resource: "Lesson",
        id: "ls-gone",
      },
    }));
    const error = await source.deleteLesson("ls-gone").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.code).toBe("not_found");
    expect(error.message).toBe("Lesson not found.");
    expect(error.isNotFound).toBe(true);
  });

  it("carries the field a 422 blames", async () => {
    const { source } = recorder(() => ({
      status: 422,
      body: {
        status: 422,
        code: "unprocessable_entity",
        message: "endMin must be greater than startMin.",
        field: "endMin",
      },
    }));
    const error = await source
      .updateLesson("ls-1", { startMin: 1200 })
      .catch((e) => e);
    expect(error.status).toBe(422);
    expect(error.field).toBe("endMin");
    expect(error.message).toBe("endMin must be greater than startMin.");
  });

  it("still fails usefully when the error body is not JSON", async () => {
    const fetchImpl = (async () =>
      new Response("<html>502</html>", { status: 502 })) as typeof fetch;
    const source = createHttpSource({ fetchImpl });
    const error = await source.listLessons().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.message).toContain("502");
  });

  it("reports an unreachable backend instead of hanging", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const source = createHttpSource({ fetchImpl });
    const error = await source.listLessons().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("network_error");
    expect(error.message).toContain("backend is running");
  });

  it("never falls back to fixture data on failure", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const source = createHttpSource({ fetchImpl });
    await expect(source.listLessons()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("base url", () => {
  it("defaults to the Next.js proxy route", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response("[]", { status: 200 });
    }) as typeof fetch;
    await createHttpSource({ fetchImpl }).listLessons();
    expect(calls[0]).toBe("/api/lessons");
  });

  it("supports an absolute origin without doubling the slash", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response("[]", { status: 200 });
    }) as typeof fetch;
    await createHttpSource({
      fetchImpl,
      baseUrl: "https://api.example.com/",
    }).listLessons();
    expect(calls[0]).toBe("https://api.example.com/lessons");
  });
});
