from sqlalchemy import CheckConstraint, UniqueConstraint

from app.models import TeacherModel
from app.schemas import TeacherCategory

EXPECTED_COLUMNS = {"id", "code", "name", "category", "usd_rate"}
NON_NULL_COLUMNS = ("id", "code", "name", "category", "usd_rate")


def test_teachers_table_name() -> None:
    assert TeacherModel.__tablename__ == "teachers"


def test_teachers_columns() -> None:
    assert set(TeacherModel.__table__.columns.keys()) == EXPECTED_COLUMNS


def test_teachers_nullability_and_primary_key() -> None:
    columns = TeacherModel.__table__.columns
    assert columns["id"].primary_key
    for name in NON_NULL_COLUMNS:
        assert columns[name].nullable is False


def test_teachers_code_unique() -> None:
    uniques = [
        constraint
        for constraint in TeacherModel.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    ]
    matching = [
        constraint
        for constraint in uniques
        if list(constraint.columns.keys()) == ["code"]
    ]
    assert matching
    assert matching[0].name == "uq_teachers_code"


def test_teachers_category_constraint() -> None:
    checks = _check_constraints()
    category_sql = " ".join(str(checks["ck_teachers_category"].sqltext).split())
    for category in TeacherCategory:
        assert f"'{category.value}'" in category_sql


def test_teachers_usd_rate_non_negative() -> None:
    checks = _check_constraints()
    rate_sql = " ".join(str(checks["ck_teachers_usd_rate"].sqltext).split())
    assert "usd_rate >= 0" in rate_sql


def _check_constraints() -> dict[str, CheckConstraint]:
    return {
        constraint.name: constraint
        for constraint in TeacherModel.__table__.constraints
        if isinstance(constraint, CheckConstraint) and constraint.name is not None
    }
