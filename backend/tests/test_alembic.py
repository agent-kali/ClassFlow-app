import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DUMMY_URL = "postgresql+psycopg://user:pass@localhost/classflow"


def _alembic(*args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["DATABASE_URL"] = DUMMY_URL
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_alembic_upgrade_sql_creates_teachers() -> None:
    result = _alembic("upgrade", "head", "--sql")
    assert result.returncode == 0, result.stderr
    sql = result.stdout.lower()
    assert "create table teachers" in sql
    assert "uq_teachers_code" in sql
    assert "ck_teachers_category" in sql
    assert "ck_teachers_usd_rate" in sql


def test_alembic_downgrade_sql_drops_teachers() -> None:
    result = _alembic("downgrade", "head:base", "--sql")
    assert result.returncode == 0, result.stderr
    assert "drop table teachers" in result.stdout.lower()


def test_alembic_upgrade_sql_creates_schedule_hierarchy() -> None:
    result = _alembic("upgrade", "head", "--sql")
    assert result.returncode == 0, result.stderr
    sql = result.stdout.lower()
    assert "create table schools" in sql
    assert "create table campuses" in sql
    assert "create table rooms" in sql
    assert "create table class_groups" in sql
    assert "uq_schools_short_name" in sql
    assert "ck_schools_color" in sql
    assert "uq_campuses_school_id_name" in sql
    assert "fk_campuses_school_id" in sql
    assert "uq_rooms_campus_id_name" in sql
    assert "fk_rooms_campus_id" in sql
    assert "uq_class_groups_school_id_code" in sql
    assert "fk_class_groups_school_id" in sql


def test_alembic_downgrade_sql_drops_schedule_hierarchy() -> None:
    result = _alembic("downgrade", "head:base", "--sql")
    assert result.returncode == 0, result.stderr
    sql = result.stdout.lower()
    assert "drop table class_groups" in sql
    assert "drop table rooms" in sql
    assert "drop table campuses" in sql
    assert "drop table schools" in sql
    assert "drop table teachers" in sql


def test_alembic_upgrade_sql_creates_lessons() -> None:
    result = _alembic("upgrade", "head", "--sql")
    assert result.returncode == 0, result.stderr
    sql = result.stdout.lower()
    assert "create table lessons" in sql
    assert "fk_lessons_class_group_id" in sql
    assert "fk_lessons_room_id" in sql
    assert "fk_lessons_teacher_id" in sql
    assert "ck_lessons_start_min" in sql
    assert "ck_lessons_end_min" in sql
    assert "ck_lessons_end_after_start" in sql
    assert "ck_lessons_status" in sql
    assert "ck_lessons_moved_from_pair" in sql
    assert "ck_lessons_moved_from_start_min" in sql


def test_alembic_downgrade_sql_drops_lessons() -> None:
    result = _alembic("downgrade", "head:base", "--sql")
    assert result.returncode == 0, result.stderr
    assert "drop table lessons" in result.stdout.lower()


def test_alembic_head_matches_orm_metadata() -> None:
    """A migration exists for every ORM table, so `upgrade head` is deployable."""
    from app.db import Base
    from app import models  # noqa: F401  register ORM tables on metadata

    result = _alembic("upgrade", "head", "--sql")
    assert result.returncode == 0, result.stderr
    sql = result.stdout.lower()
    for table in Base.metadata.tables:
        assert f"create table {table}" in sql, f"no migration creates {table}"
