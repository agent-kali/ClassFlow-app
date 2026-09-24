"""
Integration fixtures backed by a real PostgreSQL database.

The schema is built by `alembic upgrade head`, so the migrations are exercised
on every run rather than assumed. Each test runs inside a transaction that is
rolled back afterwards, which keeps tests isolated without re-creating tables.

Point TEST_DATABASE_URL at a throwaway database; `backend/docker-compose.yml`
creates `classflow_test` for exactly this.
"""

import os
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, Engine, create_engine, delete, text
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg://classflow:classflow@localhost:5432/classflow_test"
)

# Auth config has no in-code default. Tests set it before the app starts.
os.environ.setdefault("AUTH_SECRET", "test-secret-not-for-production-use-32b")
os.environ.setdefault("COOKIE_SECURE", "false")

MANAGER_EMAIL = "manager@localhost"
MANAGER_PASSWORD = "manager-test-password"


def _test_database_url() -> str:
    return os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)


@pytest.fixture(scope="session", autouse=True)
def database_url() -> Iterator[str]:
    """
    Every database-touching import reads DATABASE_URL, so tests must own it for
    the whole session. This prevents a test run from writing to a dev database.
    """
    url = _test_database_url()
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = url
    yield url
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous


def _alembic(url: str, *args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["DATABASE_URL"] = url
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


@pytest.fixture(scope="session")
def engine(database_url: str) -> Iterator[Engine]:
    probe = create_engine(database_url)
    try:
        with probe.connect() as connection:
            connection.execute(text("select 1"))
    except Exception as exc:  # pragma: no cover - environment guard
        probe.dispose()
        pytest.skip(
            "PostgreSQL is not reachable at "
            f"{database_url}. Start it with `docker compose up -d` in backend/. ({exc})"
        )
    probe.dispose()

    # A pristine schema, built the same way production is.
    down = _alembic(database_url, "downgrade", "base")
    assert down.returncode == 0, down.stderr
    up = _alembic(database_url, "upgrade", "head")
    assert up.returncode == 0, up.stderr

    db_engine = create_engine(database_url)
    yield db_engine
    db_engine.dispose()


@pytest.fixture
def connection(engine: Engine) -> Iterator[Connection]:
    """An outer transaction per test; rolling it back undoes everything."""
    conn = engine.connect()
    transaction = conn.begin()
    try:
        yield conn
    finally:
        transaction.rollback()
        conn.close()


@pytest.fixture
def db_session(connection: Connection) -> Iterator[Session]:
    # create_savepoint lets the function-scoped commit in get_db() succeed while
    # the outer transaction above still discards it after the test.
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def reference_data(db_session: Session) -> Session:
    """
    The teachers, schools, campuses, rooms and class groups that lesson foreign
    keys point at. Uses the real seed, so the seed is covered too.
    """
    from app.seed import seed_reference_data

    seed_reference_data(db_session)
    db_session.flush()
    return db_session


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    from app.db import get_db
    from app.main import app

    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture(scope="session")
def manager_password_hash() -> str:
    from app.auth import hash_password

    return hash_password(MANAGER_PASSWORD)


def insert_user(
    session: Session,
    *,
    id: str,
    email: str,
    password_hash: str,
    role: str,
    teacher_id: str | None = None,
    active: bool = True,
) -> None:
    from app.models import UserModel

    session.add(
        UserModel(
            id=id,
            email=email,
            password_hash=password_hash,
            role=role,
            teacher_id=teacher_id,
            active=active,
        )
    )
    session.flush()


def login(client: TestClient, email: str, password: str) -> TestClient:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return client


@pytest.fixture
def authenticated_client(
    client: TestClient, db_session: Session, manager_password_hash: str
) -> TestClient:
    """A manager session, with or without reference rows."""
    insert_user(
        db_session,
        id="usr-manager",
        email=MANAGER_EMAIL,
        password_hash=manager_password_hash,
        role="manager",
    )
    return login(client, MANAGER_EMAIL, MANAGER_PASSWORD)


@pytest.fixture
def seeded_client(
    authenticated_client: TestClient, reference_data: Session
) -> TestClient:
    """A manager whose database already has all lesson reference rows."""
    return authenticated_client


@pytest.fixture
def committing_client(engine: Engine) -> Iterator[TestClient]:
    """
    A client that really commits, for proving durability across independent
    sessions. It cleans up after itself since no outer transaction wraps it.
    """
    from app.auth import hash_password
    from app.db import dispose_engines
    from app.main import app
    from app.seed import seed_reference_data
    from app.models import (
        CampusModel,
        ClassGroupModel,
        LessonModel,
        RoomModel,
        SchoolModel,
        SessionModel,
        TeacherModel,
        UserModel,
    )

    dispose_engines()
    with Session(engine) as setup:
        seed_reference_data(setup)
        setup.add(
            UserModel(
                id="usr-manager",
                email=MANAGER_EMAIL,
                password_hash=hash_password(MANAGER_PASSWORD),
                role="manager",
                teacher_id=None,
                active=True,
            )
        )
        setup.commit()

    try:
        with TestClient(app) as test_client:
            login(test_client, MANAGER_EMAIL, MANAGER_PASSWORD)
            yield test_client
    finally:
        # Committed rows outlive the test, so everything goes back — otherwise
        # the transaction-isolated tests would see leftovers.
        with Session(engine) as cleanup:
            for model in (
                SessionModel,
                UserModel,
                LessonModel,
                ClassGroupModel,
                RoomModel,
                CampusModel,
                SchoolModel,
                TeacherModel,
            ):
                cleanup.execute(delete(model))
            cleanup.commit()
        dispose_engines()
