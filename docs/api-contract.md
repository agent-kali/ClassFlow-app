# REST API contract

HTTP boundary for `DataSource` (`src/data/source.ts`). Resource fields match `src/domain/types.ts` one-to-one: no extra attributes, pagination, filters, or metadata.

This document is a contract, not an implementation: no application routes, database models, authentication, migrations, or executable code.

## Asynchrony

Every `DataSource` method is asynchronous and returns a `Promise`. The HTTP request corresponds to the method call; the HTTP response is the value the promise **resolves** to.

| Method | Returned promise |
| --- | --- |
| `listSchools` | `Promise<School[]>` |
| `listCampuses` | `Promise<Campus[]>` |
| `listRooms` | `Promise<Room[]>` |
| `listTeachers` | `Promise<Teacher[]>` |
| `listClassGroups` | `Promise<ClassGroup[]>` |
| `listLessons` | `Promise<Lesson[]>` |
| `getFxRate` | `Promise<FxRate>` |
| `createLesson` | `Promise<Lesson>` |
| `updateLesson` | `Promise<void>` |
| `setLessonStatus` | `Promise<void>` |
| `rescheduleLesson` | `Promise<void>` |
| `importLessons` | `Promise<Lesson[]>` |

`Promise<void>` maps to **204 No Content** with an empty body. Other successful responses are JSON (`Content-Type: application/json`): **200 OK** for reads, **201 Created** for `createLesson` and `importLessons`.

## Value formats

Field names are unchanged. JSON on the wire uses the formats below.

### Dates — ISO 8601

Fields `date`, `capturedOn`, and `movedFrom.date` are calendar dates `YYYY-MM-DD` (ISO 8601 `date`). Example: `"2026-08-31"`. Full date-time values are not used.

### Time — `HH:MM`

Fields `startMin`, `endMin`, and `movedFrom.startMin` are **`HH:MM`** strings in JSON (24-hour clock, both components zero-padded). Examples: `"09:00"`, `"18:05"`.

In the domain these are minutes from midnight; there is no extra wire field. Mapping: `"HH:MM"` ↔ `H * 60 + M`.

Pattern: `^([01][0-9]|2[0-3]):[0-5][0-9]$`.

### Money — string with two decimal places plus currency code

Monetary amounts are JSON strings: two digits after the decimal point (dot separator), a space, then an ISO 4217 code.

Form: `"<amount> <CURRENCY>"`. Examples: `"22.00 USD"`, `"17.50 USD"`.

The only money field in the types is `Teacher.usdRate` (fixed hourly rate in USD). `FxRate.vndPerUsd` is a rate (VND per 1 USD), not an amount; in JSON it is a number, as in `types.ts`. VND is never stored: it is always derived from USD and the captured rate.

Money pattern: `^[0-9]+\.[0-9]{2} [A-Z]{3}$`.

### Statuses and other enums

Values are only those listed in `types.ts`:

| Type | Field | Values |
| --- | --- | --- |
| `LessonStatus` | `Lesson.status` | `"scheduled"` \| `"cancelled"` \| `"no-show"` |
| `TeacherCategory` | `Teacher.category` | `"native"` \| `"non-native"` \| `"esl"` |
| `SchoolColor` | `School.color` | `"teal"` \| `"amber"` \| `"plum"` \| `"moss"` |

`LessonInput` is all `Lesson` fields except `id`. `Partial<LessonInput>` is the same fields, all optional.

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
    "usdRate": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]{2} [A-Z]{3}$",
      "description": "Hourly rate: two decimal places and a currency code, e.g. \"22.00 USD\"."
    }
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
    "startMin": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
    "endMin": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
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
        "startMin": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$" }
      }
    }
  }
}
```

Constraint: `endMin` must be strictly after `startMin` on the same `date`. Otherwise **422**.

Optional fields (`cmName`, `weekCode`, `movedFrom`) may be omitted; `null` is not allowed.

### LessonInput

Same as `Lesson` without `id` (`required` excludes `id`). Request body for `createLesson` and each element of `importLessons`.

### Partial LessonInput

Same properties as `LessonInput`, all optional, `minProperties: 1`. An empty object `{}` yields **422**.

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
    "startMin": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
    "endMin": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$" }
  }
}
```

## Table: DataSource → endpoint

Exactly one HTTP endpoint per method. No query parameters: none of the `DataSource` read methods take arguments.

`{id}` is `Lesson.id` (`string`).

| Interface method | HTTP method | URL | query params | request body | response schema | Error codes |
| --- | --- | --- | --- | --- | --- | --- |
| `listSchools(): Promise<School[]>` | `GET` | `/schools` | — | — | `School[]` | — |
| `listCampuses(): Promise<Campus[]>` | `GET` | `/campuses` | — | — | `Campus[]` | — |
| `listRooms(): Promise<Room[]>` | `GET` | `/rooms` | — | — | `Room[]` | — |
| `listTeachers(): Promise<Teacher[]>` | `GET` | `/teachers` | — | — | `Teacher[]` | — |
| `listClassGroups(): Promise<ClassGroup[]>` | `GET` | `/class-groups` | — | — | `ClassGroup[]` | — |
| `listLessons(): Promise<Lesson[]>` | `GET` | `/lessons` | — | — | `Lesson[]` | — |
| `getFxRate(): Promise<FxRate>` | `GET` | `/fx-rate` | — | — | `FxRate` | `404` |
| `createLesson(input): Promise<Lesson>` | `POST` | `/lessons` | — | `LessonInput` | `Lesson` | `409`, `422` |
| `updateLesson(id, patch): Promise<void>` | `PATCH` | `/lessons/{id}` | — | `Partial<LessonInput>` | — (204) | `404`, `409`, `422` |
| `setLessonStatus(id, status): Promise<void>` | `PATCH` | `/lessons/{id}/status` | — | `SetLessonStatusBody` | — (204) | `404`, `409`, `422` |
| `rescheduleLesson(id, date, startMin, endMin): Promise<void>` | `PATCH` | `/lessons/{id}/reschedule` | — | `RescheduleLessonBody` | — (204) | `404`, `409`, `422` |
| `importLessons(inputs): Promise<Lesson[]>` | `POST` | `/lessons/import` | — | `LessonInput[]` | `Lesson[]` | `409`, `422` |

An empty collection is `[]` with **200**, not **404**. **404** only when the resource itself is missing (no lesson with `{id}`, or no captured FX rate).

## Errors

Error bodies are always JSON. Successful responses are not wrapped in an error schema.

### 404 Not Found

The resource identified by id (or the single FX rate) does not exist. Examples: `PATCH /lessons/{id}` with an unknown `id`; `GET /fx-rate` when no rate has been captured.

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

The resulting state cannot be applied: for example the room is already occupied in that interval (`roomId` + `date` + overlap of `startMin`/`endMin` with another lesson whose `status` is `"scheduled"`). Same rule for a teacher in the same interval. Lessons with `cancelled` or `no-show` do not occupy a slot.

Applies to `createLesson`, `updateLesson`, `rescheduleLesson`, `importLessons` (the entire import is rejected), and `setLessonStatus` when moving to `scheduled` if the slot is taken.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["status", "code", "message"],
  "properties": {
    "status": { "const": 409 },
    "code": { "const": "conflict" },
    "message": { "type": "string" },
    "resource": { "type": "string" },
    "id": { "type": "string" },
    "roomId": { "type": "string" },
    "teacherId": { "type": "string" },
    "date": { "type": "string", "format": "date" },
    "startMin": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$" },
    "endMin": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$" }
  }
}
```

Optional error fields are existing `Lesson` fields (`id`, `roomId`, `teacherId`, `date`, `startMin`, `endMin`) to identify the occupied slot. No new resource fields.

Example: `{"status":409,"code":"conflict","message":"Room is occupied.","resource":"Room","id":"ls-1001","roomId":"ot-03-205","date":"2026-08-31","startMin":"18:00","endMin":"19:00"}`.

### 422 Unprocessable Entity

The body does not match the schema: invalid JSON, wrong type, unknown field, empty `Partial<LessonInput>`, value outside an enum, date not ISO 8601, time not `HH:MM`, money not in the form `"12.00 USD"`, `endMin` not after `startMin`, or a reference to a missing `classGroupId` / `roomId` / `teacherId`.

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

Example: `{"status":422,"code":"unprocessable_entity","message":"endMin must be after startMin.","field":"endMin"}`.

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
