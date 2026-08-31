# REST API contract

HTTP boundary for `DataSource` (`src/data/source.ts`). Resource fields match `src/domain/types.ts` one-to-one: no extra attributes, pagination, filters, or metadata.

This document is a contract, not an implementation: no application routes, database models, authentication, migrations, or executable code.

## Asynchrony

The current `DataSource` in `src/data/source.ts` is **synchronous**. Methods return plain values (`School[]`, `Lesson`, `void`, …), not `Promise`.

`src/data/mockSource.ts` and `src/data/store.ts` call those methods synchronously. An HTTP round-trip is inherently asynchronous. A future HTTP-backed implementation must sit behind an **async adapter** or an **async replacement** of `DataSource` (as the interface comment already notes: methods become async) so the UI can `await` without changing call sites beyond that seam.

This contract describes the HTTP mapping of those methods. It does not claim the TypeScript interface returns `Promise` today.

| Method | Current TypeScript return | HTTP success |
| --- | --- | --- |
| `listSchools` | `School[]` | **200** `School[]` |
| `listCampuses` | `Campus[]` | **200** `Campus[]` |
| `listRooms` | `Room[]` | **200** `Room[]` |
| `listTeachers` | `Teacher[]` | **200** `Teacher[]` |
| `listClassGroups` | `ClassGroup[]` | **200** `ClassGroup[]` |
| `listLessons` | `Lesson[]` | **200** `Lesson[]` |
| `getFxRate` | `FxRate` | **200** `FxRate` |
| `createLesson` | `Lesson` | **201** `Lesson` |
| `updateLesson` | `void` | **204** empty body |
| `setLessonStatus` | `void` | **204** empty body |
| `rescheduleLesson` | `void` | **204** empty body |
| `importLessons` | `Lesson[]` | **201** `Lesson[]` |

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

`src/domain/conflicts.ts` detects overlaps and travel-gap warnings **after** lessons exist. The manager is shown conflicts; writes are not blocked. `src/data/store.ts` persists overlapping lessons with no uniqueness check on teacher, room, or time.

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

`rescheduleLesson` in `store.ts` sets `movedFrom` to the first origin (`before.movedFrom` if already present, otherwise `{ date, startMin }` of the lesson before the move). `updateLesson` on `DataSource` applies the patch as given and does not invent `movedFrom`.

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

## Table: DataSource → endpoint

Exactly one HTTP endpoint per method. No query parameters: none of the `DataSource` read methods take arguments.

`{id}` is `Lesson.id` (`string`).

Signatures below are the **current synchronous** interface.

| Interface method | HTTP method | URL | query params | request body | response schema | Error codes |
| --- | --- | --- | --- | --- | --- | --- |
| `listSchools(): School[]` | `GET` | `/schools` | — | — | `School[]` | — |
| `listCampuses(): Campus[]` | `GET` | `/campuses` | — | — | `Campus[]` | — |
| `listRooms(): Room[]` | `GET` | `/rooms` | — | — | `Room[]` | — |
| `listTeachers(): Teacher[]` | `GET` | `/teachers` | — | — | `Teacher[]` | — |
| `listClassGroups(): ClassGroup[]` | `GET` | `/class-groups` | — | — | `ClassGroup[]` | — |
| `listLessons(): Lesson[]` | `GET` | `/lessons` | — | — | `Lesson[]` | — |
| `getFxRate(): FxRate` | `GET` | `/fx-rate` | — | — | `FxRate` | — |
| `createLesson(input): Lesson` | `POST` | `/lessons` | — | `LessonInput` | `Lesson` | `422` |
| `updateLesson(id, patch): void` | `PATCH` | `/lessons/{id}` | — | `Partial<LessonInput>` | — (204) | `404`, `422` |
| `setLessonStatus(id, status): void` | `PATCH` | `/lessons/{id}/status` | — | `SetLessonStatusBody` | — (204) | `404`, `422` |
| `rescheduleLesson(id, date, startMin, endMin): void` | `PATCH` | `/lessons/{id}/reschedule` | — | `RescheduleLessonBody` | — (204) | `404`, `422` |
| `importLessons(inputs): Lesson[]` | `POST` | `/lessons/import` | — | `LessonInput[]` | `Lesson[]` | `422` |

An empty collection is `[]` with **200**, not **404**. **404** applies when a mutation targets a lesson `{id}` that does not exist (`store.ts` finds no row and no-ops). **409** is not used.

`editLesson` exists on the store only, not on `DataSource`, and has no endpoint.

## Errors

Error bodies are always JSON. Successful responses are not wrapped in an error schema.

### 404 Not Found

No lesson with the given `{id}`. Used by `updateLesson`, `setLessonStatus`, and `rescheduleLesson`.

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

Every `DataSource` method is covered by **exactly one** endpoint. This contract has no extra endpoints.

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
| 12 | `importLessons` | `POST /lessons/import` | yes | yes |

Total: **12 methods, 12 endpoints, 0 extras**. No `GET /lessons/{id}`: `DataSource` has no single-lesson read. No query filters: list methods take no arguments.
