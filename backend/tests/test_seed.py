"""
The seed is what makes a fresh database usable: lessons cannot be saved until
the rows their foreign keys point at exist.
"""

import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    CampusModel,
    ClassGroupModel,
    LessonModel,
    RoomModel,
    SchoolModel,
    TeacherModel,
)
from app.seed import (
    CLASS_GROUPS,
    ROOMS,
    SMOKE_LESSONS,
    monday_of_current_week,
    seed_reference_data,
    seed_smoke_lessons,
)

REFERENCE_COUNTS = (
    (SchoolModel, 4),
    (CampusModel, 5),
    (RoomModel, 16),
    (ClassGroupModel, 15),
    (TeacherModel, 6),
)


def _count(session: Session, model: type) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_seed_inserts_reference_data(db_session: Session) -> None:
    seed_reference_data(db_session)
    db_session.flush()
    for model, expected in REFERENCE_COUNTS:
        assert _count(db_session, model) == expected


def test_seed_is_idempotent(db_session: Session) -> None:
    seed_reference_data(db_session)
    seed_reference_data(db_session)
    seed_reference_data(db_session)
    db_session.flush()
    for model, expected in REFERENCE_COUNTS:
        assert _count(db_session, model) == expected


def test_seed_does_not_create_lessons_by_default(db_session: Session) -> None:
    """The persistent path must work with an empty lessons table."""
    seed_reference_data(db_session)
    db_session.flush()
    assert _count(db_session, LessonModel) == 0


def test_reference_ids_match_the_frontend_fixtures(db_session: Session) -> None:
    """
    These exact ids appear in src/data/fixtures — a mismatch would make every
    lesson block render without a class code, room or school.
    """
    seed_reference_data(db_session)
    db_session.flush()
    room_ids = set(db_session.scalars(select(RoomModel.id)).all())
    assert {"ot-03-205", "sy-03-203", "ld-07-401", "fli-06-108"} <= room_ids
    group_ids = set(db_session.scalars(select(ClassGroupModel.id)).all())
    assert {"ot-lp12b01b", "sy-sj3", "ld-il401", "fli-3c3"} <= group_ids
    teacher_ids = set(db_session.scalars(select(TeacherModel.id)).all())
    assert {"t-dav", "t-oli", "t-mir", "t-leo", "t-tam", "t-kat"} == teacher_ids


def test_reference_rows_satisfy_their_own_foreign_keys(db_session: Session) -> None:
    seed_reference_data(db_session)
    db_session.flush()
    school_ids = set(db_session.scalars(select(SchoolModel.id)).all())
    campus_ids = set(db_session.scalars(select(CampusModel.id)).all())
    for campus in db_session.scalars(select(CampusModel)).all():
        assert campus.school_id in school_ids
    for room in db_session.scalars(select(RoomModel)).all():
        assert room.campus_id in campus_ids
    for group in db_session.scalars(select(ClassGroupModel)).all():
        assert group.school_id in school_ids


def test_smoke_lessons_are_optional_and_idempotent(db_session: Session) -> None:
    seed_reference_data(db_session)
    seed_smoke_lessons(db_session)
    seed_smoke_lessons(db_session)
    db_session.flush()
    assert _count(db_session, LessonModel) == len(SMOKE_LESSONS)


def test_smoke_lessons_cover_the_product_rules(db_session: Session) -> None:
    """A smoke set that cannot show a cancellation or a move is not useful."""
    seed_reference_data(db_session)
    seed_smoke_lessons(db_session)
    db_session.flush()
    rows = db_session.scalars(select(LessonModel)).all()
    statuses = {row.status for row in rows}
    assert {"scheduled", "cancelled", "no-show"} <= statuses
    assert any(row.moved_from_date is not None for row in rows)
    # Irregular durations are the point of the continuous-time ruler.
    assert len({row.end_min - row.start_min for row in rows}) > 1


def test_smoke_lessons_are_anchored_on_the_seeded_week(db_session: Session) -> None:
    monday = datetime.date(2026, 9, 14)
    seed_reference_data(db_session)
    seed_smoke_lessons(db_session, monday=monday)
    db_session.flush()
    dates = set(db_session.scalars(select(LessonModel.date)).all())
    assert min(dates) == monday
    assert max(dates) <= monday + datetime.timedelta(days=6)


def test_monday_of_current_week_is_a_monday() -> None:
    assert monday_of_current_week().weekday() == 0
    assert monday_of_current_week(datetime.date(2026, 9, 17)) == datetime.date(
        2026, 9, 14
    )


def test_seeded_lessons_reference_seeded_rooms_and_groups() -> None:
    room_ids = {room["id"] for room in ROOMS}
    group_ids = {group["id"] for group in CLASS_GROUPS}
    for lesson in SMOKE_LESSONS:
        assert lesson["room_id"] in room_ids
        assert lesson["class_group_id"] in group_ids
