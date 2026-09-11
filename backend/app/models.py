from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.schemas import SchoolColor, TeacherCategory

_CATEGORY_SQL = ", ".join(f"'{category.value}'" for category in TeacherCategory)
_COLOR_SQL = ", ".join(f"'{color.value}'" for color in SchoolColor)


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
