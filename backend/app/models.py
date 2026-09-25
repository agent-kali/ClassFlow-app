import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.schemas import LessonStatus, SchoolColor, TeacherCategory, UserRole

_CATEGORY_SQL = ", ".join(f"'{category.value}'" for category in TeacherCategory)
_COLOR_SQL = ", ".join(f"'{color.value}'" for color in SchoolColor)
_STATUS_SQL = ", ".join(f"'{status.value}'" for status in LessonStatus)
_ROLE_SQL = ", ".join(f"'{role.value}'" for role in UserRole)


class TeacherModel(Base):
    __tablename__ = "teachers"
    __table_args__ = (
        UniqueConstraint("code", name="uq_teachers_code"),
        CheckConstraint(
            f"category IN ({_CATEGORY_SQL})",
            name="ck_teachers_category",
        ),
        CheckConstraint("usd_rate >= 0", name="ck_teachers_usd_rate"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    usd_rate: Mapped[Decimal] = mapped_column(Numeric, nullable=False)


class SchoolModel(Base):
    __tablename__ = "schools"
    __table_args__ = (
        UniqueConstraint("short_name", name="uq_schools_short_name"),
        CheckConstraint(
            f"color IN ({_COLOR_SQL})",
            name="ck_schools_color",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    short_name: Mapped[str] = mapped_column(String, nullable=False)
    district: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str] = mapped_column(String, nullable=False)
    has_class_managers: Mapped[bool] = mapped_column(Boolean, nullable=False)

    campuses: Mapped[list["CampusModel"]] = relationship(back_populates="school")
    class_groups: Mapped[list["ClassGroupModel"]] = relationship(back_populates="school")


class CampusModel(Base):
    __tablename__ = "campuses"
    __table_args__ = (
        UniqueConstraint("school_id", "name", name="uq_campuses_school_id_name"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    school_id: Mapped[str] = mapped_column(
        ForeignKey("schools.id", name="fk_campuses_school_id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    address: Mapped[str] = mapped_column(String, nullable=False)

    school: Mapped["SchoolModel"] = relationship(back_populates="campuses")
    rooms: Mapped[list["RoomModel"]] = relationship(back_populates="campus")


class RoomModel(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("campus_id", "name", name="uq_rooms_campus_id_name"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campus_id: Mapped[str] = mapped_column(
        ForeignKey("campuses.id", name="fk_rooms_campus_id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)

    campus: Mapped["CampusModel"] = relationship(back_populates="rooms")


class ClassGroupModel(Base):
    __tablename__ = "class_groups"
    __table_args__ = (
        UniqueConstraint("school_id", "code", name="uq_class_groups_school_id_code"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    school_id: Mapped[str] = mapped_column(
        ForeignKey("schools.id", name="fk_class_groups_school_id"),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String, nullable=False)
    program: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[str] = mapped_column(String, nullable=False)

    school: Mapped["SchoolModel"] = relationship(back_populates="class_groups")


class LessonModel(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint(
            "start_min BETWEEN 0 AND 1439",
            name="ck_lessons_start_min",
        ),
        CheckConstraint(
            "end_min BETWEEN 1 AND 1440",
            name="ck_lessons_end_min",
        ),
        CheckConstraint("end_min > start_min", name="ck_lessons_end_after_start"),
        CheckConstraint(
            f"status IN ({_STATUS_SQL})",
            name="ck_lessons_status",
        ),
        CheckConstraint(
            "(moved_from_date IS NULL) = (moved_from_start_min IS NULL)",
            name="ck_lessons_moved_from_pair",
        ),
        CheckConstraint(
            "moved_from_start_min IS NULL OR moved_from_start_min BETWEEN 0 AND 1439",
            name="ck_lessons_moved_from_start_min",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    start_min: Mapped[int] = mapped_column(Integer, nullable=False)
    end_min: Mapped[int] = mapped_column(Integer, nullable=False)
    class_group_id: Mapped[str] = mapped_column(
        ForeignKey("class_groups.id", name="fk_lessons_class_group_id"),
        nullable=False,
    )
    room_id: Mapped[str] = mapped_column(
        ForeignKey("rooms.id", name="fk_lessons_room_id"),
        nullable=False,
    )
    teacher_id: Mapped[str] = mapped_column(
        ForeignKey("teachers.id", name="fk_lessons_teacher_id"),
        nullable=False,
    )
    cm_name: Mapped[str | None] = mapped_column(String, nullable=True)
    curriculum: Mapped[str] = mapped_column(String, nullable=False)
    week_code: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    moved_from_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    moved_from_start_min: Mapped[int | None] = mapped_column(Integer, nullable=True)

    class_group: Mapped["ClassGroupModel"] = relationship()
    room: Mapped["RoomModel"] = relationship()
    teacher: Mapped["TeacherModel"] = relationship()


class UserModel(Base):
    """
    An application login. Teacher profile data stays on `teachers`; this row
    only records who can sign in and which teacher they are, if either.
    """

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        UniqueConstraint("teacher_id", name="uq_users_teacher_id"),
        CheckConstraint("email = lower(email)", name="ck_users_email_lowercase"),
        CheckConstraint(f"role IN ({_ROLE_SQL})", name="ck_users_role"),
        CheckConstraint(
            "(role = 'teacher' AND teacher_id IS NOT NULL) "
            "OR (role = 'manager' AND teacher_id IS NULL)",
            name="ck_users_role_teacher",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    teacher_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "teachers.id",
            name="fk_users_teacher_id",
            ondelete="RESTRICT",
        ),
        nullable=True,
    )
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    teacher: Mapped["TeacherModel | None"] = relationship()
    sessions: Mapped[list["SessionModel"]] = relationship(back_populates="user")


class SessionModel(Base):
    """Opaque login session. The cookie holds the raw token; the row holds its HMAC."""

    __tablename__ = "sessions"
    __table_args__ = (UniqueConstraint("token_hash", name="uq_sessions_token_hash"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", name="fk_sessions_user_id", ondelete="CASCADE"),
        nullable=False,
    )
    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    user: Mapped["UserModel"] = relationship(back_populates="sessions")
