"""
Idempotent bootstrap for local and development databases.

Lessons have foreign keys to class groups, rooms and teachers, so those rows
have to exist before a manager can save anything. This seeds exactly that
reference data, using the same ids the frontend fixtures already use, and
nothing else: the persistent product path is expected to work with an empty
`lessons` table.

    python -m app.seed                   # reference data only
    python -m app.seed --with-lessons    # plus a small smoke-test set
    python -m app.seed --reset-lessons   # delete every lesson first

Re-running is safe: every row is upserted by primary key.
"""

import argparse
import datetime
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db import get_session_factory
from app.models import (
    CampusModel,
    ClassGroupModel,
    LessonModel,
    RoomModel,
    SchoolModel,
    TeacherModel,
)

AGENCY_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")

SCHOOLS: list[dict[str, Any]] = [
    {"id": "ot", "name": "Outeref", "short_name": "OT", "district": "District 3", "color": "teal", "has_class_managers": True},
    {"id": "sy", "name": "Superyouth", "short_name": "SY", "district": "District 7", "color": "amber", "has_class_managers": False},
    {"id": "ld", "name": "London School", "short_name": "LD", "district": "Binh Thanh", "color": "plum", "has_class_managers": False},
    {"id": "fli", "name": "Flamingo", "short_name": "FLI", "district": "Thu Duc", "color": "moss", "has_class_managers": True},
]

CAMPUSES: list[dict[str, Any]] = [
    {"id": "ot-03", "school_id": "ot", "name": "OT03", "address": "12 Nguyen Dinh Chieu, District 3"},
    {"id": "ot-17", "school_id": "ot", "name": "OT17", "address": "88 Tran Hung Dao, District 3"},
    {"id": "sy-03", "school_id": "sy", "name": "SY3", "address": "21 Ton Dat Tien, District 7"},
    {"id": "ld-07", "school_id": "ld", "name": "LD7", "address": "600 Dien Bien Phu, Binh Thanh"},
    {"id": "fli-06", "school_id": "fli", "name": "FLI06", "address": "35 Vo Van Ngan, Thu Duc"},
]

ROOMS: list[dict[str, Any]] = [
    {"id": "ot-03-201", "campus_id": "ot-03", "name": "201"},
    {"id": "ot-03-205", "campus_id": "ot-03", "name": "205"},
    {"id": "ot-03-302", "campus_id": "ot-03", "name": "302"},
    {"id": "ot-17-103", "campus_id": "ot-17", "name": "103"},
    {"id": "ot-17-104", "campus_id": "ot-17", "name": "104"},
    {"id": "ot-17-208", "campus_id": "ot-17", "name": "208"},
    {"id": "sy-03-101", "campus_id": "sy-03", "name": "101"},
    {"id": "sy-03-102", "campus_id": "sy-03", "name": "102"},
    {"id": "sy-03-203", "campus_id": "sy-03", "name": "203"},
    {"id": "sy-03-204", "campus_id": "sy-03", "name": "204"},
    {"id": "ld-07-401", "campus_id": "ld-07", "name": "401"},
    {"id": "ld-07-403", "campus_id": "ld-07", "name": "403"},
    {"id": "ld-07-405", "campus_id": "ld-07", "name": "405"},
    {"id": "fli-06-108", "campus_id": "fli-06", "name": "108"},
    {"id": "fli-06-201", "campus_id": "fli-06", "name": "201"},
    {"id": "fli-06-305", "campus_id": "fli-06", "name": "305"},
]

CLASS_GROUPS: list[dict[str, Any]] = [
    {"id": "ot-lp12b01b", "school_id": "ot", "code": "LP12B01B", "program": "Little Pioneers", "level": "Primary 12B"},
    {"id": "ot-lp09a02a", "school_id": "ot", "code": "LP09A02A", "program": "Little Pioneers", "level": "Primary 9A"},
    {"id": "ot-tn07b01c", "school_id": "ot", "code": "TN07B01C", "program": "Teen Navigators", "level": "Pre-Intermediate"},
    {"id": "ot-tn11a02b", "school_id": "ot", "code": "TN11A02B", "program": "Teen Navigators", "level": "Intermediate"},
    {"id": "sy-starters", "school_id": "sy", "code": "STARTERS", "program": "Cambridge Young Learners", "level": "Pre-A1"},
    {"id": "sy-movers", "school_id": "sy", "code": "MOVERS", "program": "Cambridge Young Learners", "level": "A1"},
    {"id": "sy-flyers", "school_id": "sy", "code": "FLYERS", "program": "Cambridge Young Learners", "level": "A2"},
    {"id": "sy-sj3", "school_id": "sy", "code": "SJ3", "program": "Junior English", "level": "Grade 3"},
    {"id": "sy-sj5", "school_id": "sy", "code": "SJ5", "program": "Junior English", "level": "Grade 5"},
    {"id": "ld-il102", "school_id": "ld", "code": "IL102", "program": "IELTS Foundation", "level": "Band 4.5\u20135.5"},
    {"id": "ld-il401", "school_id": "ld", "code": "IL401", "program": "IELTS Advanced", "level": "Band 6.5+"},
    {"id": "ld-it201", "school_id": "ld", "code": "IT201", "program": "TOEIC Intensive", "level": "600+"},
    {"id": "fli-3c3", "school_id": "fli", "code": "3C3", "program": "General English K-12", "level": "Grade 3"},
    {"id": "fli-4a1", "school_id": "fli", "code": "4A1", "program": "General English K-12", "level": "Grade 4"},
    {"id": "fli-5b2", "school_id": "fli", "code": "5B2", "program": "General English K-12", "level": "Grade 5"},
]

TEACHERS: list[dict[str, Any]] = [
    {"id": "t-dav", "code": "DAV", "name": "David Okafor", "category": "native", "usd_rate": Decimal("22")},
    {"id": "t-oli", "code": "OLI", "name": "Oliver Grant", "category": "native", "usd_rate": Decimal("23.5")},
    {"id": "t-mir", "code": "MIR", "name": "Mira Novak", "category": "non-native", "usd_rate": Decimal("17.5")},
    {"id": "t-leo", "code": "LEO", "name": "Leo Martins", "category": "non-native", "usd_rate": Decimal("18")},
    {"id": "t-tam", "code": "TAM", "name": "Tamara Reyes", "category": "esl", "usd_rate": Decimal("16")},
    {"id": "t-kat", "code": "KAT", "name": "Katya Orlova", "category": "esl", "usd_rate": Decimal("15.5")},
]


def _minutes(hhmm: str) -> int:
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


# A deliberately small week that still exercises every product rule the manager
# schedule shows: irregular durations, a cancellation, a no-show, a recorded
# move, a teacher double-booking, and a tight campus-to-campus travel gap.
# (day offset from Monday, start, end, class group, room, teacher, curriculum, extras)
SMOKE_LESSONS: list[dict[str, Any]] = [
    {"id": "seed-ls-01", "day": 0, "start": "7:50", "end": "8:25", "class_group_id": "fli-3c3", "room_id": "fli-06-108", "teacher_id": "t-tam", "curriculum": "Family & Friends 3: U4 pp.30\u201331", "cm_name": "Ms Hoa", "week_code": "W12"},
    {"id": "seed-ls-02", "day": 0, "start": "18:00", "end": "19:00", "class_group_id": "ot-lp12b01b", "room_id": "ot-03-205", "teacher_id": "t-dav", "curriculum": "Prepare 5: U15 pp.88\u201389", "cm_name": "DHT", "week_code": "W6D1"},
    {"id": "seed-ls-03", "day": 0, "start": "19:10", "end": "20:40", "class_group_id": "ot-tn11a02b", "room_id": "ot-03-302", "teacher_id": "t-dav", "curriculum": "Solutions Int: U7 Grammar \u2014 reported speech", "cm_name": "NTL", "week_code": "W6D1"},
    {"id": "seed-ls-04", "day": 0, "start": "19:30", "end": "21:00", "class_group_id": "ld-il401", "room_id": "ld-07-401", "teacher_id": "t-oli", "curriculum": "Writing Task 2: opinion essays \u2014 model + timed drill", "week_code": "D7"},
    # Travel warning: OT03 -> OT17 with a 30-minute gap (threshold is 45).
    {"id": "seed-ls-05", "day": 1, "start": "17:30", "end": "18:30", "class_group_id": "ot-lp09a02a", "room_id": "ot-03-201", "teacher_id": "t-mir", "curriculum": "Prepare 3: U12 pp.72\u201373", "cm_name": "PTM", "week_code": "W6D2"},
    {"id": "seed-ls-06", "day": 1, "start": "19:00", "end": "20:10", "class_group_id": "ot-tn07b01c", "room_id": "ot-17-103", "teacher_id": "t-mir", "curriculum": "Prepare 4: U11 Vocabulary \u2014 jobs & work", "cm_name": "LVA", "week_code": "W6D2"},
    # Cancelled: the school closed for a ceremony. Visibly excluded from pay.
    {"id": "seed-ls-07", "day": 2, "start": "19:10", "end": "20:10", "class_group_id": "ot-lp09a02a", "room_id": "ot-03-201", "teacher_id": "t-mir", "curriculum": "Prepare 3: U12 pp.74\u201375", "cm_name": "PTM", "week_code": "W6D3", "status": "cancelled"},
    # Teacher double-booking: LEO is in two places at 18:30.
    {"id": "seed-ls-08", "day": 3, "start": "18:00", "end": "19:30", "class_group_id": "ld-it201", "room_id": "ld-07-405", "teacher_id": "t-leo", "curriculum": "TOEIC RC: Part 7 double passages", "week_code": "D4"},
    {"id": "seed-ls-09", "day": 3, "start": "18:30", "end": "19:30", "class_group_id": "sy-sj3", "room_id": "sy-03-101", "teacher_id": "t-leo", "curriculum": "Cover: speaking club (double-booked)"},
    # No-show: the class didn't turn up. Not paid.
    {"id": "seed-ls-10", "day": 4, "start": "15:30", "end": "16:15", "class_group_id": "sy-sj5", "room_id": "sy-03-203", "teacher_id": "t-leo", "curriculum": "Project: my neighbourhood \u2014 presentations", "status": "no-show"},
    # Rescheduled from Thursday 17:30 — the move stays visible on the lesson.
    {"id": "seed-ls-11", "day": 4, "start": "17:30", "end": "18:40", "class_group_id": "ot-tn07b01c", "room_id": "ot-17-103", "teacher_id": "t-mir", "curriculum": "Prepare 4: U11 Grammar \u2014 present perfect", "cm_name": "LVA", "week_code": "W6D4", "moved_from_day": 3, "moved_from_start": "17:30"},
]


def _upsert(session: Session, model: type, rows: list[dict[str, Any]]) -> None:
    """Insert or refresh every row by primary key, so re-running changes nothing."""
    if not rows:
        return
    statement = insert(model)
    updatable = {
        column: statement.excluded[column]
        for column in rows[0]
        if column != "id"
    }
    session.execute(
        statement.on_conflict_do_update(index_elements=["id"], set_=updatable), rows
    )


def monday_of_current_week(today: datetime.date | None = None) -> datetime.date:
    """Weeks start Monday in this domain."""
    day = today if today is not None else datetime.datetime.now(AGENCY_TIMEZONE).date()
    return day - datetime.timedelta(days=day.weekday())


def seed_reference_data(session: Session) -> None:
    _upsert(session, SchoolModel, SCHOOLS)
    _upsert(session, CampusModel, CAMPUSES)
    _upsert(session, RoomModel, ROOMS)
    _upsert(session, ClassGroupModel, CLASS_GROUPS)
    _upsert(session, TeacherModel, TEACHERS)


def seed_smoke_lessons(session: Session, monday: datetime.date | None = None) -> None:
    anchor = monday if monday is not None else monday_of_current_week()
    rows: list[dict[str, Any]] = []
    for lesson in SMOKE_LESSONS:
        moved_from_day = lesson.get("moved_from_day")
        rows.append(
            {
                "id": lesson["id"],
                "date": anchor + datetime.timedelta(days=lesson["day"]),
                "start_min": _minutes(lesson["start"]),
                "end_min": _minutes(lesson["end"]),
                "class_group_id": lesson["class_group_id"],
                "room_id": lesson["room_id"],
                "teacher_id": lesson["teacher_id"],
                "cm_name": lesson.get("cm_name"),
                "curriculum": lesson["curriculum"],
                "week_code": lesson.get("week_code"),
                "status": lesson.get("status", "scheduled"),
                "moved_from_date": (
                    anchor + datetime.timedelta(days=moved_from_day)
                    if moved_from_day is not None
                    else None
                ),
                "moved_from_start_min": (
                    _minutes(lesson["moved_from_start"])
                    if lesson.get("moved_from_start") is not None
                    else None
                ),
            }
        )
    _upsert(session, LessonModel, rows)


def delete_all_lessons(session: Session) -> None:
    session.execute(delete(LessonModel))


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed ClassFlow reference data.")
    parser.add_argument(
        "--with-lessons",
        action="store_true",
        help="also insert a small deterministic lesson set for smoke testing",
    )
    parser.add_argument(
        "--reset-lessons",
        action="store_true",
        help="delete every lesson before seeding",
    )
    args = parser.parse_args()

    with get_session_factory()() as session:
        if args.reset_lessons:
            delete_all_lessons(session)
        seed_reference_data(session)
        if args.with_lessons:
            seed_smoke_lessons(session)
        session.commit()

    summary = "reference data"
    if args.with_lessons:
        summary += f" + {len(SMOKE_LESSONS)} smoke lessons"
    print(f"Seeded {summary}.")


if __name__ == "__main__":
    main()
