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
