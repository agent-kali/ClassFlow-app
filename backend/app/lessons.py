"""
Lesson persistence: the mapping between `LessonModel` rows and the wire
`Lesson` schema, plus the six operations the manager schedule performs.

Dates and minute offsets are local Asia/Ho_Chi_Minh wall-clock values. They
are stored exactly as the manager entered them and are never converted to UTC.
"""

import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFoundError, UnprocessableError
from app.models import ClassGroupModel, LessonModel, RoomModel, TeacherModel
from app.schemas import (
    Lesson,
    LessonCreate,
    LessonPatch,
    MovedFrom,
    RescheduleLessonBody,
)

# Referenced id -> the request field that carries it, for 422 reporting.
_REFERENCES = (
    ("class_group_id", "classGroupId", ClassGroupModel),
    ("room_id", "roomId", RoomModel),
    ("teacher_id", "teacherId", TeacherModel),
)


def _new_lesson_id() -> str:
    return f"ls-{uuid4().hex[:12]}"


def to_schema(row: LessonModel) -> Lesson:
    # Absent optionals are omitted, never sent as null — the wire schema
    # rejects explicit nulls, on the way out as well as in.
    payload: dict[str, object] = {
        "id": row.id,
        "date": row.date.isoformat(),
        "startMin": row.start_min,
        "endMin": row.end_min,
        "classGroupId": row.class_group_id,
        "roomId": row.room_id,
        "teacherId": row.teacher_id,
        "curriculum": row.curriculum,
        "status": row.status,
    }
    if row.cm_name is not None:
        payload["cmName"] = row.cm_name
    if row.week_code is not None:
        payload["weekCode"] = row.week_code
    if row.moved_from_date is not None and row.moved_from_start_min is not None:
        payload["movedFrom"] = MovedFrom(
            date=row.moved_from_date.isoformat(),
            startMin=row.moved_from_start_min,
        )
    return Lesson.model_validate(payload)


def _assert_references_exist(session: Session, *, values: dict[str, object]) -> None:
    """
    Referenced rows are checked before insert so a bad id is a contract-shaped
    422 rather than an IntegrityError surfacing as a 500. The foreign keys stay
    in place as the real guarantee.
    """
    for column, wire_field, model in _REFERENCES:
        id_value = values.get(column)
        if id_value is None:
            continue
        exists = session.get(model, id_value)
        if exists is None:
            raise UnprocessableError(
                f"No {model.__tablename__} row with id {id_value!r}.", wire_field
            )


def _require_row(session: Session, lesson_id: str) -> LessonModel:
    row = session.get(LessonModel, lesson_id)
    if row is None:
        raise NotFoundError("Lesson", lesson_id)
    return row


def _row_values_from_create(payload: LessonCreate) -> dict[str, object]:
    return {
        "date": datetime.date.fromisoformat(payload.date),
        "start_min": payload.start_min,
        "end_min": payload.end_min,
        "class_group_id": payload.class_group_id,
        "room_id": payload.room_id,
        "teacher_id": payload.teacher_id,
        "cm_name": payload.cm_name,
        "curriculum": payload.curriculum,
        "week_code": payload.week_code,
        "status": payload.status.value,
        "moved_from_date": (
            datetime.date.fromisoformat(payload.moved_from.date)
            if payload.moved_from is not None
            else None
        ),
        "moved_from_start_min": (
            payload.moved_from.start_min if payload.moved_from is not None else None
        ),
    }


def list_lessons(session: Session, *, teacher_id: str | None = None) -> list[Lesson]:
    """
    `teacher_id` is taken from the session, never from the query string.
    None returns the agency schedule; a teacher id returns only that teacher's rows.
    """
    statement = select(LessonModel).order_by(
        LessonModel.date, LessonModel.start_min, LessonModel.id
    )
    if teacher_id is not None:
        statement = statement.where(LessonModel.teacher_id == teacher_id)
    rows = session.scalars(statement).all()
    return [to_schema(row) for row in rows]


def create_lesson(session: Session, payload: LessonCreate) -> Lesson:
    values = _row_values_from_create(payload)
    _assert_references_exist(session, values=values)
    row = LessonModel(id=_new_lesson_id(), **values)
    session.add(row)
    session.flush()
    return to_schema(row)


def import_lessons(session: Session, payloads: list[LessonCreate]) -> list[Lesson]:
    """
    Atomic batch: a single invalid element fails the whole request, so nothing
    is written. Overlaps within the batch, or with stored lessons, are kept.
    """
    rows: list[LessonModel] = []
    for payload in payloads:
        values = _row_values_from_create(payload)
        _assert_references_exist(session, values=values)
        row = LessonModel(id=_new_lesson_id(), **values)
        session.add(row)
        rows.append(row)
    session.flush()
    return [to_schema(row) for row in rows]


def patch_lesson(session: Session, lesson_id: str, patch: LessonPatch) -> Lesson:
    """
    Applies the patch as given. It does not invent `movedFrom`: the caller
    decides whether an edit counts as a move and sends the field explicitly.
    """
    row = _require_row(session, lesson_id)
    provided = patch.model_dump(exclude_unset=True)

    values: dict[str, object] = {}
    for key, value in provided.items():
        if key == "date":
            values["date"] = datetime.date.fromisoformat(value)
        elif key == "status":
            values["status"] = value.value if hasattr(value, "value") else value
        elif key == "moved_from":
            moved_from = patch.moved_from
            values["moved_from_date"] = datetime.date.fromisoformat(moved_from.date)
            values["moved_from_start_min"] = moved_from.start_min
        else:
            values[key] = value

    _assert_references_exist(session, values=values)

    start_min = values.get("start_min", row.start_min)
    end_min = values.get("end_min", row.end_min)
    if end_min <= start_min:
        raise UnprocessableError("endMin must be greater than startMin.", "endMin")

    for key, value in values.items():
        setattr(row, key, value)
    session.flush()
    return to_schema(row)


def set_lesson_status(session: Session, lesson_id: str, status: str) -> Lesson:
    row = _require_row(session, lesson_id)
    row.status = status
    session.flush()
    return to_schema(row)


def reschedule_lesson(
    session: Session, lesson_id: str, body: RescheduleLessonBody
) -> Lesson:
    """
    Moves the lesson and records where the move started from. The origin is the
    *first* one: a lesson moved twice still points at where it originally sat.
    """
    row = _require_row(session, lesson_id)

    if row.moved_from_date is None or row.moved_from_start_min is None:
        row.moved_from_date = row.date
        row.moved_from_start_min = row.start_min

    row.date = datetime.date.fromisoformat(body.date)
    row.start_min = body.start_min
    row.end_min = body.end_min
    session.flush()
    return to_schema(row)


def delete_lesson(session: Session, lesson_id: str) -> None:
    row = _require_row(session, lesson_id)
    session.delete(row)
    session.flush()
