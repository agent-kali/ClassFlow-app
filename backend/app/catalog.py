"""
Reference lists for the schedule screens.

A manager receives the agency catalog. A teacher receives only the rows their
own lessons point at, plus their own teacher record. The fx rate is the one
agency spot rate and is not filtered.
"""

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.errors import ForbiddenError
from app.models import (
    CampusModel,
    ClassGroupModel,
    LessonModel,
    RoomModel,
    SchoolModel,
    TeacherModel,
    UserModel,
)
from app.schemas import Campus, ClassGroup, Room, School, Teacher, UserRole


def _teacher_id(user: UserModel) -> str | None:
    """None means the caller is a manager and may see every row."""
    if user.role == UserRole.manager.value:
        return None
    if user.role == UserRole.teacher.value and user.teacher_id:
        return user.teacher_id
    raise ForbiddenError()


def _lesson_room_ids(teacher_id: str):
    return select(LessonModel.room_id).where(LessonModel.teacher_id == teacher_id)


def _lesson_group_ids(teacher_id: str):
    return select(LessonModel.class_group_id).where(LessonModel.teacher_id == teacher_id)


def list_schools(db: Session, user: UserModel) -> list[School]:
    teacher_id = _teacher_id(user)
    statement = select(SchoolModel).order_by(SchoolModel.id)
    if teacher_id is not None:
        campus_ids = select(RoomModel.campus_id).where(RoomModel.id.in_(_lesson_room_ids(teacher_id)))
        school_from_campus = select(CampusModel.school_id).where(CampusModel.id.in_(campus_ids))
        school_from_group = select(ClassGroupModel.school_id).where(
            ClassGroupModel.id.in_(_lesson_group_ids(teacher_id))
        )
        statement = statement.where(
            or_(
                SchoolModel.id.in_(school_from_campus),
                SchoolModel.id.in_(school_from_group),
            )
        )
    rows = db.scalars(statement).all()
    return [
        School(
            id=row.id,
            name=row.name,
            shortName=row.short_name,
            district=row.district,
            color=row.color,
            hasClassManagers=row.has_class_managers,
        )
        for row in rows
    ]


def list_campuses(db: Session, user: UserModel) -> list[Campus]:
    teacher_id = _teacher_id(user)
    statement = select(CampusModel).order_by(CampusModel.id)
    if teacher_id is not None:
        campus_ids = select(RoomModel.campus_id).where(RoomModel.id.in_(_lesson_room_ids(teacher_id)))
        statement = statement.where(CampusModel.id.in_(campus_ids))
    rows = db.scalars(statement).all()
    return [
        Campus(id=row.id, schoolId=row.school_id, name=row.name, address=row.address)
        for row in rows
    ]


def list_rooms(db: Session, user: UserModel) -> list[Room]:
    teacher_id = _teacher_id(user)
    statement = select(RoomModel).order_by(RoomModel.id)
    if teacher_id is not None:
        statement = statement.where(RoomModel.id.in_(_lesson_room_ids(teacher_id)))
    rows = db.scalars(statement).all()
    return [Room(id=row.id, campusId=row.campus_id, name=row.name) for row in rows]


def list_class_groups(db: Session, user: UserModel) -> list[ClassGroup]:
    teacher_id = _teacher_id(user)
    statement = select(ClassGroupModel).order_by(ClassGroupModel.id)
    if teacher_id is not None:
        statement = statement.where(ClassGroupModel.id.in_(_lesson_group_ids(teacher_id)))
    rows = db.scalars(statement).all()
    return [
        ClassGroup(
            id=row.id,
            schoolId=row.school_id,
            code=row.code,
            program=row.program,
            level=row.level,
        )
        for row in rows
    ]


def list_teachers(db: Session, user: UserModel) -> list[Teacher]:
    teacher_id = _teacher_id(user)
    statement = select(TeacherModel).order_by(TeacherModel.code)
    if teacher_id is not None:
        statement = statement.where(TeacherModel.id == teacher_id)
    rows = db.scalars(statement).all()
    return [
        Teacher(
            id=row.id,
            code=row.code,
            name=row.name,
            category=row.category,
            usdRate=float(row.usd_rate),
        )
        for row in rows
    ]
