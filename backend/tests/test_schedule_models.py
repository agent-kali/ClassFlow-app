from sqlalchemy import Boolean, CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from app.models import CampusModel, ClassGroupModel, RoomModel, SchoolModel
from app.schemas import SchoolColor

SCHOOL_COLUMNS = {"id", "name", "short_name", "district", "color", "has_class_managers"}
CAMPUS_COLUMNS = {"id", "school_id", "name", "address"}
ROOM_COLUMNS = {"id", "campus_id", "name"}
CLASS_GROUP_COLUMNS = {"id", "school_id", "code", "program", "level"}


def test_schools_table_name() -> None:
    assert SchoolModel.__tablename__ == "schools"


def test_campuses_table_name() -> None:
    assert CampusModel.__tablename__ == "campuses"


def test_rooms_table_name() -> None:
    assert RoomModel.__tablename__ == "rooms"


def test_class_groups_table_name() -> None:
    assert ClassGroupModel.__tablename__ == "class_groups"


def test_schools_columns() -> None:
    assert set(SchoolModel.__table__.columns.keys()) == SCHOOL_COLUMNS


def test_campuses_columns() -> None:
    assert set(CampusModel.__table__.columns.keys()) == CAMPUS_COLUMNS


def test_rooms_columns() -> None:
    assert set(RoomModel.__table__.columns.keys()) == ROOM_COLUMNS


def test_class_groups_columns() -> None:
    assert set(ClassGroupModel.__table__.columns.keys()) == CLASS_GROUP_COLUMNS


def test_schools_nullability_and_primary_key() -> None:
    _assert_pk_and_not_null(SchoolModel, SCHOOL_COLUMNS)


def test_campuses_nullability_and_primary_key() -> None:
    _assert_pk_and_not_null(CampusModel, CAMPUS_COLUMNS)


def test_rooms_nullability_and_primary_key() -> None:
    _assert_pk_and_not_null(RoomModel, ROOM_COLUMNS)


def test_class_groups_nullability_and_primary_key() -> None:
    _assert_pk_and_not_null(ClassGroupModel, CLASS_GROUP_COLUMNS)


def test_schools_has_class_managers_is_boolean() -> None:
    column = SchoolModel.__table__.columns["has_class_managers"]
    assert isinstance(column.type, Boolean)


def test_schools_short_name_unique() -> None:
    matching = _unique_on(SchoolModel, ["short_name"])
    assert matching
    assert matching[0].name == "uq_schools_short_name"


def test_campuses_school_id_name_unique() -> None:
    matching = _unique_on(CampusModel, ["school_id", "name"])
    assert matching
    assert matching[0].name == "uq_campuses_school_id_name"


def test_rooms_campus_id_name_unique() -> None:
    matching = _unique_on(RoomModel, ["campus_id", "name"])
    assert matching
    assert matching[0].name == "uq_rooms_campus_id_name"


def test_class_groups_school_id_code_unique() -> None:
    matching = _unique_on(ClassGroupModel, ["school_id", "code"])
    assert matching
    assert matching[0].name == "uq_class_groups_school_id_code"


def test_schools_color_constraint() -> None:
    checks = {
        constraint.name: constraint
        for constraint in SchoolModel.__table__.constraints
        if isinstance(constraint, CheckConstraint) and constraint.name is not None
    }
    color_sql = " ".join(str(checks["ck_schools_color"].sqltext).split())
    for color in SchoolColor:
        assert f"'{color.value}'" in color_sql


def test_campuses_school_id_fk() -> None:
    _assert_named_fk(
        CampusModel,
        name="fk_campuses_school_id",
        columns=["school_id"],
        referred_table="schools",
        referred_columns=["id"],
    )


def test_rooms_campus_id_fk() -> None:
    _assert_named_fk(
        RoomModel,
        name="fk_rooms_campus_id",
        columns=["campus_id"],
        referred_table="campuses",
        referred_columns=["id"],
    )


def test_class_groups_school_id_fk() -> None:
    _assert_named_fk(
        ClassGroupModel,
        name="fk_class_groups_school_id",
        columns=["school_id"],
        referred_table="schools",
        referred_columns=["id"],
    )


def _assert_pk_and_not_null(model: type, columns: set[str]) -> None:
    table_columns = model.__table__.columns
    assert table_columns["id"].primary_key
    for name in columns:
        assert table_columns[name].nullable is False


def _unique_on(model: type, column_names: list[str]) -> list[UniqueConstraint]:
    uniques = [
        constraint
        for constraint in model.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    ]
    return [
        constraint
        for constraint in uniques
        if list(constraint.columns.keys()) == column_names
    ]


def _assert_named_fk(
    model: type,
    *,
    name: str,
    columns: list[str],
    referred_table: str,
    referred_columns: list[str],
) -> None:
    fks = [
        constraint
        for constraint in model.__table__.constraints
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
