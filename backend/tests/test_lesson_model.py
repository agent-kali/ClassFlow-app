from sqlalchemy import CheckConstraint, Date, ForeignKeyConstraint, Integer, String

from app.db import Base
from app.models import LessonModel
from app.schemas import LessonStatus

EXPECTED_COLUMNS = {
    "id",
    "date",
    "start_min",
    "end_min",
    "class_group_id",
    "room_id",
    "teacher_id",
    "cm_name",
    "curriculum",
    "week_code",
    "status",
    "moved_from_date",
    "moved_from_start_min",
}
NON_NULL_COLUMNS = (
    "id",
    "date",
    "start_min",
    "end_min",
    "class_group_id",
    "room_id",
    "teacher_id",
    "curriculum",
    "status",
)
NULLABLE_COLUMNS = (
    "cm_name",
    "week_code",
    "moved_from_date",
    "moved_from_start_min",
)
CHECK_CONSTRAINT_NAMES = {
    "ck_lessons_start_min",
    "ck_lessons_end_min",
    "ck_lessons_end_after_start",
    "ck_lessons_status",
    "ck_lessons_moved_from_pair",
    "ck_lessons_moved_from_start_min",
}


def test_lessons_table_name() -> None:
    assert LessonModel.__tablename__ == "lessons"


def test_lessons_columns() -> None:
    assert set(LessonModel.__table__.columns.keys()) == EXPECTED_COLUMNS


def test_lessons_primary_key() -> None:
    columns = LessonModel.__table__.columns
    assert columns["id"].primary_key
    assert [column.name for column in LessonModel.__table__.primary_key.columns] == ["id"]


def test_lessons_column_types() -> None:
    columns = LessonModel.__table__.columns
    assert isinstance(columns["id"].type, String)
    assert isinstance(columns["date"].type, Date)
    assert isinstance(columns["start_min"].type, Integer)
    assert isinstance(columns["end_min"].type, Integer)
    assert isinstance(columns["class_group_id"].type, String)
    assert isinstance(columns["room_id"].type, String)
    assert isinstance(columns["teacher_id"].type, String)
    assert isinstance(columns["cm_name"].type, String)
    assert isinstance(columns["curriculum"].type, String)
    assert isinstance(columns["week_code"].type, String)
    assert isinstance(columns["status"].type, String)
    assert isinstance(columns["moved_from_date"].type, Date)
    assert isinstance(columns["moved_from_start_min"].type, Integer)


def test_lessons_nullability() -> None:
    columns = LessonModel.__table__.columns
    for name in NON_NULL_COLUMNS:
        assert columns[name].nullable is False
    for name in NULLABLE_COLUMNS:
        assert columns[name].nullable is True


def test_lessons_class_group_id_fk() -> None:
    _assert_named_fk(
        name="fk_lessons_class_group_id",
        columns=["class_group_id"],
        referred_table="class_groups",
        referred_columns=["id"],
    )


def test_lessons_room_id_fk() -> None:
    _assert_named_fk(
        name="fk_lessons_room_id",
        columns=["room_id"],
        referred_table="rooms",
        referred_columns=["id"],
    )


def test_lessons_teacher_id_fk() -> None:
    _assert_named_fk(
        name="fk_lessons_teacher_id",
        columns=["teacher_id"],
        referred_table="teachers",
        referred_columns=["id"],
    )


def test_lessons_check_constraint_names() -> None:
    assert set(_check_constraints()) == CHECK_CONSTRAINT_NAMES


def test_lessons_start_min_bounds() -> None:
    sql = _check_sql("ck_lessons_start_min")
    assert "start_min BETWEEN 0 AND 1439" in sql


def test_lessons_end_min_bounds() -> None:
    sql = _check_sql("ck_lessons_end_min")
    assert "end_min BETWEEN 1 AND 1440" in sql


def test_lessons_end_after_start() -> None:
    sql = _check_sql("ck_lessons_end_after_start")
    assert "end_min > start_min" in sql


def test_lessons_status_constraint() -> None:
    sql = _check_sql("ck_lessons_status")
    for status in LessonStatus:
        assert f"'{status.value}'" in sql


def test_lessons_moved_from_pair() -> None:
    sql = _check_sql("ck_lessons_moved_from_pair")
    assert "moved_from_date IS NULL" in sql
    assert "moved_from_start_min IS NULL" in sql
    assert "=" in sql


def test_lessons_moved_from_start_min_bounds() -> None:
    sql = _check_sql("ck_lessons_moved_from_start_min")
    assert "moved_from_start_min IS NULL" in sql
    assert "moved_from_start_min BETWEEN 0 AND 1439" in sql


def test_lessons_registers_on_base_metadata() -> None:
    assert "lessons" in Base.metadata.tables
    assert Base.metadata.tables["lessons"] is LessonModel.__table__


def _check_constraints() -> dict[str, CheckConstraint]:
    return {
        constraint.name: constraint
        for constraint in LessonModel.__table__.constraints
        if isinstance(constraint, CheckConstraint) and constraint.name is not None
    }


def _check_sql(name: str) -> str:
    return " ".join(str(_check_constraints()[name].sqltext).split())


def _assert_named_fk(
    *,
    name: str,
    columns: list[str],
    referred_table: str,
    referred_columns: list[str],
) -> None:
    fks = [
        constraint
        for constraint in LessonModel.__table__.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    ]
    matching = [constraint for constraint in fks if constraint.name == name]
    assert matching
    constraint = matching[0]
    assert list(constraint.column_keys) == columns
    assert constraint.referred_table.name == referred_table
    assert list(constraint.elements[i].column.name for i in range(len(referred_columns))) == (
        referred_columns
    )
