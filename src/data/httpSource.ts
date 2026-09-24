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
import type { DataSource } from "./source";

/**
 * The HTTP implementation of the DataSource seam, speaking the wire format in
 * docs/api-contract.md. Field names are already camelCase on both sides, so
 * there is no mapping layer here — only transport and error shaping.
 */

/** The error body the contract defines for 404 and 422. */
interface ApiErrorBody {
  status?: number;
  code?: string;
  message?: string;
  resource?: string;
  id?: string;
  field?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Present when the failure is tied to a single field, e.g. "endMin". */
  readonly field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }

  /** True when the lesson is gone — someone else deleted it, or it never existed. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

const NETWORK_MESSAGE =
  "Could not reach the ClassFlow API. Check that the backend is running.";

async function readError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }
  const message =
    body?.message ?? `Request failed with status ${response.status}.`;
  const code = body?.code ?? "request_failed";
  return new ApiError(response.status, code, message, body?.field);
}

export interface HttpSourceOptions {
  /** Prefixes every path. Defaults to the Next.js proxy route. */
  baseUrl?: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export function createHttpSource(options: HttpSourceOptions = {}): DataSource {
  const baseUrl = (options.baseUrl ?? "/api").replace(/\/$/, "");
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));

  async function send(
    path: string,
    init?: { method?: string; body?: unknown }
  ): Promise<Response> {
    const hasBody = init?.body !== undefined;
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method: init?.method ?? "GET",
        headers: hasBody ? { "Content-Type": "application/json" } : undefined,
        body: hasBody ? JSON.stringify(init.body) : undefined,
      });
    } catch {
      // A refused connection or DNS failure never reaches the server, so there
      // is no contract body to read. Surface it as its own error.
      throw new ApiError(0, "network_error", NETWORK_MESSAGE);
    }
    if (!response.ok) throw await readError(response);
    return response;
  }

  async function getJson<T>(path: string): Promise<T> {
    const response = await send(path);
    return (await response.json()) as T;
  }

  async function sendJson<T>(
    path: string,
    method: string,
    body: unknown
  ): Promise<T> {
    const response = await send(path, { method, body });
    return (await response.json()) as T;
  }

  return {
    listSchools: () => getJson<School[]>("/schools"),
    listCampuses: () => getJson<Campus[]>("/campuses"),
    listRooms: () => getJson<Room[]>("/rooms"),
    listTeachers: () => getJson<Teacher[]>("/teachers"),
    listClassGroups: () => getJson<ClassGroup[]>("/class-groups"),
    listLessons: () => getJson<Lesson[]>("/lessons"),
    getFxRate: () => getJson<FxRate>("/fx-rate"),

    // JSON.stringify drops `undefined` properties, which is exactly what the
    // contract wants: optional fields are omitted, never sent as null.
    createLesson: (input: LessonInput) => sendJson<Lesson>("/lessons", "POST", input),

    updateLesson: (id: string, patch: Partial<LessonInput>) =>
      sendJson<Lesson>(`/lessons/${encodeURIComponent(id)}`, "PATCH", patch),

    setLessonStatus: (id: string, status: LessonStatus) =>
      sendJson<Lesson>(`/lessons/${encodeURIComponent(id)}/status`, "PATCH", { status }),

    rescheduleLesson: (id: string, date: string, startMin: number, endMin: number) =>
      sendJson<Lesson>(`/lessons/${encodeURIComponent(id)}/reschedule`, "PATCH", {
        date,
        startMin,
        endMin,
      }),

    deleteLesson: async (id: string) => {
      await send(`/lessons/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    importLessons: (inputs: LessonInput[]) =>
      sendJson<Lesson[]>("/lessons/import", "POST", inputs),
  };
}
