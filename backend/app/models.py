from decimal import Decimal

from sqlalchemy import CheckConstraint, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.schemas import TeacherCategory

_CATEGORY_SQL = ", ".join(f"'{category.value}'" for category in TeacherCategory)


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
