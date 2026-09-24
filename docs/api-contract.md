# REST API contract

HTTP boundary for `DataSource` (`src/data/source.ts`). Resource fields match `src/domain/types.ts` one-to-one: no extra attributes, pagination, filters, or metadata.

This document defines the wire format. It is implemented by the FastAPI app in `backend/app/main.py` over PostgreSQL, and consumed by `src/data/httpSource.ts`. The browser calls these paths on its own origin under `/api`; Next.js forwards them to FastAPI. There is no second browser origin and no CORS setup.

Schedule routes require a session. Authentication is the three routes in [Authentication](#authentication). `GET /health` stays public.

## Asynchrony

`DataSource` in `src/data/source.ts` is **async**: every method returns a `Promise`. `src/data/httpSource.ts` implements it over `fetch`; `src/data/mockSource.ts` is a self-contained in-memory implementation of the same interface, used only when `NEXT_PUBLIC_DATA_SOURCE=mock`. `src/data/store.ts` caches what the source returns and is the only `await` boundary the UI sees.

| Method | TypeScript return | HTTP success |
| --- | --- | --- |
| `listSchools` | `Promise<School[]>` | **200** `School[]` |
| `listCampuses` | `Promise<Campus[]>` | **200** `Campus[]` |
| `listRooms` | `Promise<Room[]>` | **200** `Room[]` |
| `listTeachers` | `Promise<Teacher[]>` | **200** `Teacher[]` |
| `listClassGroups` | `Promise<ClassGroup[]>` | **200** `ClassGroup[]` |
| `listLessons` | `Promise<Lesson[]>` | **200** `Lesson[]` |
| `getFxRate` | `Promise<FxRate>` | **200** `FxRate` |
| `createLesson` | `Promise<Lesson>` | **201** `Lesson` |
| `updateLesson` | `Promise<Lesson>` | **200** `Lesson` |
| `setLessonStatus` | `Promise<Lesson>` | **200** `Lesson` |
| `rescheduleLesson` | `Promise<Lesson>` | **200** `Lesson` |
| `deleteLesson` | `Promise<void>` | **204** empty body |
| `importLessons` | `Promise<Lesson[]>` | **201** `Lesson[]` |

### Why mutations return the lesson

`rescheduleLesson` derives `movedFrom` on the server (see [Resource schemas](#resource-schemas)). An empty **204** would leave the client unable to know the resulting lesson without either refetching the whole collection or re-implementing that rule. Returning the updated resource keeps the cache exactly equal to stored state after one round trip, and keeps the move rule in one place.

`deleteLesson` has nothing to return, so it stays **204**.

Successful JSON responses use `Content-Type: application/json`.

## Value formats

Wire types match `src/domain/types.ts`. There is no `HH:MM` conversion and no formatted money strings.

### Dates — `YYYY-MM-DD`

Fields `date`, `capturedOn`, and `movedFrom.date` are calendar-date strings `YYYY-MM-DD` (ISO 8601 date, no time component). Example: `"2026-08-31"`.

Lesson `date` values and minute offsets (`startMin`, `endMin`, `movedFrom.startMin`) are **local Asia/Ho_Chi_Minh wall-clock time**. They are not converted to UTC and are not stored as UTC instants.

### Minutes from midnight — integers

As in `Lesson`: duration is derived; slots are not fixed.

| Field | JSON type | Range |
| --- | --- | --- |
| `startMin` | integer | `0`–`1439` |
| `endMin` | integer | `1`–`1440`, strictly greater than `startMin` |
| `movedFrom.startMin` | integer | `0`–`1439` |

`endMin` of `1440` is the end of the local calendar day (24:00). A value that is not an integer, is out of range, or has `endMin <= startMin` is **422**.

### Money and FX — numbers

`Teacher.usdRate` is a JSON **number** (fixed hourly rate in USD). Example: `22`, `23.5`.

`FxRate.vndPerUsd` is a JSON **number** (VND per 1 USD). VND amounts are never stored; they are always derived from USD and the captured rate.

### Statuses and other enums

Values are only those listed in `types.ts`:

| Type | Field | Values |
| --- | --- | --- |
| `LessonStatus` | `Lesson.status` | `"scheduled"` \| `"cancelled"` \| `"no-show"` |
| `TeacherCategory` | `Teacher.category` | `"native"` \| `"non-native"` \| `"esl"` |
| `SchoolColor` | `School.color` | `"teal"` \| `"amber"` \| `"plum"` \| `"moss"` |

`LessonInput` is all `Lesson` fields except `id`. `Partial<LessonInput>` is the same fields, all optional.

## Conflicts are persisted, not rejected

`src/domain/conflicts.ts` detects overlaps and travel-gap warnings **after** lessons exist. The manager is shown conflicts; writes are not blocked. The `lessons` table has no uniqueness constraint on teacher, room, or time, so overlapping lessons are stored side by side.

Therefore this contract does **not** use **409** for schedule collisions. That would invent a business rule the domain does not enforce.

- **Teacher overlaps** are accepted and persisted.
- **Room overlaps** are accepted and persisted.
- **Travel gaps** (same teacher, different campuses, gap under `MIN_TRAVEL_GAP_MINUTES` / 45) are warnings computed by `detectConflicts`, not rejected writes.
- **`importLessons` may contain overlaps** among imported rows and with existing lessons; the batch is still persisted.
- Cancelled and no-show lessons do not participate in conflict detection (`conflicts.ts`), but that filtering is read-side only and does not change write acceptance.
- There is no `DataSource` method to list conflicts; they are not an HTTP resource in this contract.

Malformed or invalid **import** batches (body that does not match `LessonInput[]`, including any element that fails the `LessonInput` schema) are rejected **atomically** with **422**: no lesson from that request is created.

## Resource schemas

`additionalProperties: false` on every object. An unknown field in a request body yields **422**.

### School

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "name", "shortName", "district", "color", "hasClassManagers"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "shortName": { "type": "string" },
    "district": { "type": "string" },
    "color": { "enum": ["teal", "amber", "plum", "moss"] },
    "hasClassManagers": { "type": "boolean" }
  }
}
```

### Campus

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "schoolId", "name", "address"],
  "properties": {
    "id": { "type": "string" },
    "schoolId": { "type": "string" },
    "name": { "type": "string" },
    "address": { "type": "string" }
  }
}
```

### Room

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "campusId", "name"],
  "properties": {
    "id": { "type": "string" },
    "campusId": { "type": "string" },
    "name": { "type": "string" }
  }
}
```

### Teacher

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "code", "name", "category", "usdRate"],
  "properties": {
    "id": { "type": "string" },
    "code": { "type": "string" },
    "name": { "type": "string" },
    "category": { "enum": ["native", "non-native", "esl"] },
    "usdRate": { "type": "number" }
  }
}
```

### ClassGroup

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "schoolId", "code", "program", "level"],
  "properties": {
    "id": { "type": "string" },
    "schoolId": { "type": "string" },
    "code": { "type": "string" },
    "program": { "type": "string" },
    "level": { "type": "string" }
  }
}
```

### Lesson

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id",
    "date",
    "startMin",
    "endMin",
    "classGroupId",
    "roomId",
    "teacherId",
    "curriculum",
    "status"
  ],
  "properties": {
    "id": { "type": "string" },
    "date": { "type": "string", "format": "date" },
    "startMin": { "type": "integer", "minimum": 0, "maximum": 1439 },
    "endMin": { "type": "integer", "minimum": 1, "maximum": 1440 },
    "classGroupId": { "type": "string" },
    "roomId": { "type": "string" },
    "teacherId": { "type": "string" },
    "cmName": { "type": "string" },
    "curriculum": { "type": "string" },
    "weekCode": { "type": "string" },
    "status": { "enum": ["scheduled", "cancelled", "no-show"] },
    "movedFrom": {
      "type": "object",
      "additionalProperties": false,
      "required": ["date", "startMin"],
      "properties": {
        "date": { "type": "string", "format": "date" },
        "startMin": { "type": "integer", "minimum": 0, "maximum": 1439 }
      }
    }
  }
}
```

Constraint: `endMin` must be strictly greater than `startMin`. Otherwise **422**.

Optional fields (`cmName`, `weekCode`, `movedFrom`) may be omitted; `null` is not allowed.

`PATCH /lessons/{id}/reschedule` sets `movedFrom` to the first origin: the stored `movedFrom` if the lesson has already been moved, otherwise `{ date, startMin }` of the lesson as it stood before this move. A lesson moved twice still reports where it originally sat, not the latest hop.

`updateLesson` applies the patch as given and does not invent `movedFrom`. The caller decides whether an edit counts as a move and sends the field explicitly — `editLesson` in `store.ts` does this, which is why it has no endpoint of its own.

### LessonInput

Same as `Lesson` without `id` (`required` excludes `id`). Request body for `createLesson` and each element of `importLessons`.

### Partial LessonInput

Same properties as `LessonInput`, all optional. Matches `Partial<LessonInput>` in TypeScript. An empty object is a no-op patch, as in `store.ts`.

### FxRate

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["vndPerUsd", "capturedOn", "source"],
  "properties": {
    "vndPerUsd": { "type": "number" },
    "capturedOn": { "type": "string", "format": "date" },
    "source": { "type": "string" }
  }
}
```

The current store always has one captured rate. `getFxRate` has no id argument.

### SetLessonStatusBody

The `status` argument of `setLessonStatus` is a `LessonStatus`.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["status"],
  "properties": {
    "status": { "enum": ["scheduled", "cancelled", "no-show"] }
  }
}
```

### RescheduleLessonBody

The `date`, `startMin`, and `endMin` arguments of `rescheduleLesson` are the same fields as on `Lesson`.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["date", "startMin", "endMin"],
  "properties": {
    "date": { "type": "string", "format": "date" },
    "startMin": { "type": "integer", "minimum": 0, "maximum": 1439 },
    "endMin": { "type": "integer", "minimum": 1, "maximum": 1440 }
  }
}
```

## Authentication

A session is an HttpOnly cookie named `classflow_session`. The browser never sees a token in `localStorage`, and responses never include `password_hash`. Role is not accepted from the client.

| Method | URL | Success | Errors |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | **200** `AuthUser` and `Set-Cookie` | **401** `invalid_credentials`, **422** |
| `POST` | `/auth/logout` | **204** and the cookie is cleared | — |
| `GET` | `/auth/me` | **200** `AuthUser` | **401** `unauthorized` |

`POST /auth/login` body is `{ "email": string, "password": string }` with `additionalProperties: false`. Email is lowercased before lookup. Logout is idempotent when no session is present.

`AuthUser` is `{ id, email, role }` and, for a teacher, `teacher: { id, code, name }`. `role` is `"manager"` or `"teacher"`. A manager response omits `teacher`. The teacher object has no `usdRate`.

**401** and **403** use the same envelope as the other errors:

```json
{ "status": 401, "code": "unauthorized", "message": "Authentication required." }
```

```json
{ "status": 401, "code": "invalid_credentials", "message": "Invalid email or password." }
```

```json
{ "status": 403, "code": "forbidden", "message": "You do not have permission to do that." }
```

Unauthenticated schedule reads and writes are **401**. A teacher calling any lesson mutation is **403**, including when the lesson id does not exist. A manager mutating a missing lesson is still **404**. Validation stays **422**.

## Who sees which rows

`GET /lessons` ignores query parameters. A manager receives every lesson. A teacher receives `teacher_id` equal to the session's linked teacher.

`GET /teachers` is every teacher for a manager, and only the linked teacher for a teacher account.

`GET /schools`, `GET /campuses`, `GET /rooms`, and `GET /class-groups` are the full catalog for a manager. For a teacher they are only the rows reachable from that teacher's lessons (the lesson's room, that room's campus, the lesson's class group, and the schools of those campuses and class groups). A teacher with no lessons receives `[]`.

`GET /fx-rate` is the one agency spot rate for any authenticated user. Teachers need it to show earnings. It is not another teacher's pay and it is not the school catalog.

## Table: DataSource → endpoint

Exactly one HTTP endpoint per `DataSource` method. No query parameters: none of the `DataSource` read methods take arguments. The authenticated caller changes which rows come back; it does not add a filter argument. The auth routes above are not `DataSource` methods.

`{id}` is `Lesson.id` (`string`).

| Interface method | HTTP method | URL | query params | request body | response schema | Error codes |
| --- | --- | --- | --- | --- | --- | --- |
| `listSchools(): Promise<School[]>` | `GET` | `/schools` | — | — | `School[]` scoped to the session | `401` |
| `listCampuses(): Promise<Campus[]>` | `GET` | `/campuses` | — | — | `Campus[]` scoped to the session | `401` |
| `listRooms(): Promise<Room[]>` | `GET` | `/rooms` | — | — | `Room[]` scoped to the session | `401` |
| `listTeachers(): Promise<Teacher[]>` | `GET` | `/teachers` | — | — | `Teacher[]` scoped to the session | `401` |
| `listClassGroups(): Promise<ClassGroup[]>` | `GET` | `/class-groups` | — | — | `ClassGroup[]` scoped to the session | `401` |
| `listLessons(): Promise<Lesson[]>` | `GET` | `/lessons` | — | — | `Lesson[]` scoped to the session | `401` |
| `getFxRate(): Promise<FxRate>` | `GET` | `/fx-rate` | — | — | `FxRate` | `401` |
| `createLesson(input): Promise<Lesson>` | `POST` | `/lessons` | — | `LessonInput` | `Lesson` (201) | `401`, `403`, `422` |
| `updateLesson(id, patch): Promise<Lesson>` | `PATCH` | `/lessons/{id}` | — | `Partial<LessonInput>` | `Lesson` (200) | `401`, `403`, `404`, `422` |
| `setLessonStatus(id, status): Promise<Lesson>` | `PATCH` | `/lessons/{id}/status` | — | `SetLessonStatusBody` | `Lesson` (200) | `401`, `403`, `404`, `422` |
| `rescheduleLesson(id, date, startMin, endMin): Promise<Lesson>` | `PATCH` | `/lessons/{id}/reschedule` | — | `RescheduleLessonBody` | `Lesson` (200) | `401`, `403`, `404`, `422` |
| `deleteLesson(id): Promise<void>` | `DELETE` | `/lessons/{id}` | — | — | — (204) | `401`, `403`, `404` |
| `importLessons(inputs): Promise<Lesson[]>` | `POST` | `/lessons/import` | — | `LessonInput[]` | `Lesson[]` (201) | `401`, `403`, `422` |

An empty collection is `[]` with **200**, not **404**. **404** applies when a mutation targets a lesson `{id}` that does not exist. **409** is not used.

`editLesson` exists on the store only, not on `DataSource`, and has no endpoint. It resolves `movedFrom` from the cached lesson and then calls `updateLesson`.

### DELETE /lessons/{id}

Removes the lesson permanently. Deletion is how a lesson that should never have existed is corrected; a lesson that was scheduled and then did not happen is a `cancelled` or `no-show` **status**, not a delete, because those stay visible and explicitly unpaid.

- **204** with an empty body on success.
- **404** with the [not-found body](#404-not-found) when no lesson has that `{id}`. Deleting the same `{id}` twice therefore returns **204** and then **404**; the operation is not silently idempotent, consistent with every other mutation on a missing `{id}`.
- **409** is not used. A lesson that overlaps another is still deletable, and nothing blocks the delete.
- There is no soft delete, no `deletedAt`, and no cascade: `Lesson` is the leaf of the model.

## Errors

Error bodies are always JSON. Successful responses are not wrapped in an error schema.

### 404 Not Found

No lesson with the given `{id}`. Used by `updateLesson`, `setLessonStatus`, `rescheduleLesson`, and `deleteLesson`.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["status", "code", "message"],
  "properties": {
    "status": { "const": 404 },
    "code": { "const": "not_found" },
    "message": { "type": "string" },
    "resource": { "type": "string" },
    "id": { "type": "string" }
  }
}
```

Example: `{"status":404,"code":"not_found","message":"Lesson not found.","resource":"Lesson","id":"ls-1001"}`.

### 409 Conflict

Not used. Overlaps and travel gaps are not write-time invariants. See [Conflicts are persisted, not rejected](#conflicts-are-persisted-not-rejected).

### 422 Unprocessable Entity

The body does not match the schema: invalid JSON, wrong type, unknown field, value outside an enum, `date` not `YYYY-MM-DD`, `startMin` / `endMin` / `movedFrom.startMin` not integers in range, `endMin <= startMin`, or `usdRate` / `vndPerUsd` not a number.

Two further cases are **422**, because the body is well-formed but not acceptable:

- **A referenced id does not exist.** `classGroupId`, `roomId` or `teacherId` naming a row that is not in the database is reported with that `field`. The foreign keys remain the real guarantee; this check only keeps the failure inside the documented error shape.
- **A patch whose merged result is invalid.** `Partial<LessonInput>` may carry only one side of the time pair, so `endMin > startMin` is checked against the patch merged with the stored lesson and reported on `endMin`.

For `importLessons`, any invalid element fails the **entire** batch; nothing is written.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["status", "code", "message"],
  "properties": {
    "status": { "const": 422 },
    "code": { "const": "unprocessable_entity" },
    "message": { "type": "string" },
    "field": { "type": "string" }
  }
}
```

`field` is a field name from `types.ts` when the error is tied to a single field.

Example: `{"status":422,"code":"unprocessable_entity","message":"endMin must be greater than startMin.","field":"endMin"}`.

## Coverage checklist

Every `DataSource` method is covered by **exactly one** endpoint. The only routes outside that list are `GET /health` and `/auth/login`, `/auth/logout`, `/auth/me`.

| # | DataSource method | Endpoint | Covered by exactly one | No extras |
| --- | --- | --- | --- | --- |
| 1 | `listSchools` | `GET /schools` | yes | yes |
| 2 | `listCampuses` | `GET /campuses` | yes | yes |
| 3 | `listRooms` | `GET /rooms` | yes | yes |
| 4 | `listTeachers` | `GET /teachers` | yes | yes |
| 5 | `listClassGroups` | `GET /class-groups` | yes | yes |
| 6 | `listLessons` | `GET /lessons` | yes | yes |
| 7 | `getFxRate` | `GET /fx-rate` | yes | yes |
| 8 | `createLesson` | `POST /lessons` | yes | yes |
| 9 | `updateLesson` | `PATCH /lessons/{id}` | yes | yes |
| 10 | `setLessonStatus` | `PATCH /lessons/{id}/status` | yes | yes |
| 11 | `rescheduleLesson` | `PATCH /lessons/{id}/reschedule` | yes | yes |
| 12 | `deleteLesson` | `DELETE /lessons/{id}` | yes | yes |
| 13 | `importLessons` | `POST /lessons/import` | yes | yes |

Total: **13 methods, 13 endpoints, 0 extras**. No `GET /lessons/{id}`: `DataSource` has no single-lesson read. No query filters: list methods take no arguments, so `GET /lessons` returns the whole collection.
