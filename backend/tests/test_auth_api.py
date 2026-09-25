"""Login, logout, and the current-user read against real PostgreSQL."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import MANAGER_EMAIL, MANAGER_PASSWORD, insert_user, login


def test_valid_login_sets_a_session_cookie(
    client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    insert_user(
        db_session,
        id="usr-manager",
        email=MANAGER_EMAIL,
        password_hash=manager_password_hash,
        role="manager",
    )
    response = client.post(
        "/auth/login",
        json={"email": "Manager@Localhost", "password": MANAGER_PASSWORD},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body == {"id": "usr-manager", "email": MANAGER_EMAIL, "role": "manager"}
    assert "password_hash" not in body
    assert "passwordHash" not in body
    cookie = response.headers["set-cookie"].lower()
    assert "classflow_session=" in cookie
    assert "httponly" in cookie
    assert "samesite=lax" in cookie


def test_me_identifies_the_authenticated_user(authenticated_client: TestClient) -> None:
    response = authenticated_client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == MANAGER_EMAIL
    assert "password" not in response.text


def test_invalid_password_is_401(
    client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    insert_user(
        db_session,
        id="usr-manager",
        email=MANAGER_EMAIL,
        password_hash=manager_password_hash,
        role="manager",
    )
    response = client.post(
        "/auth/login",
        json={"email": MANAGER_EMAIL, "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


def test_unknown_email_is_401(client: TestClient) -> None:
    response = client.post(
        "/auth/login",
        json={"email": "nobody@localhost", "password": "whatever"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


def test_inactive_user_cannot_log_in(
    client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    insert_user(
        db_session,
        id="usr-disabled",
        email="disabled@localhost",
        password_hash=manager_password_hash,
        role="manager",
        active=False,
    )
    response = client.post(
        "/auth/login",
        json={"email": "disabled@localhost", "password": MANAGER_PASSWORD},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


def test_unauthenticated_schedule_read_is_401(client: TestClient) -> None:
    response = client.get("/lessons")
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_logout_removes_the_session(authenticated_client: TestClient) -> None:
    assert authenticated_client.post("/auth/logout").status_code == 204
    me = authenticated_client.get("/auth/me")
    lessons = authenticated_client.get("/lessons")
    assert me.status_code == 401
    assert lessons.status_code == 401


def test_second_login_replaces_only_the_current_browser_session(
    client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    from sqlalchemy import func, select

    from app.main import app
    from app.models import SessionModel

    insert_user(
        db_session,
        id="usr-manager",
        email=MANAGER_EMAIL,
        password_hash=manager_password_hash,
        role="manager",
    )
    first = client.post(
        "/auth/login",
        json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
    )
    assert first.status_code == 200, first.text
    token_a = client.cookies.get("classflow_session")
    assert token_a

    other = TestClient(app)
    login(other, MANAGER_EMAIL, MANAGER_PASSWORD)
    token_other = other.cookies.get("classflow_session")
    assert token_other and token_other != token_a

    second = client.post(
        "/auth/login",
        json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
    )
    assert second.status_code == 200, second.text
    token_b = client.cookies.get("classflow_session")
    assert token_b and token_b != token_a

    stale = TestClient(app)
    stale.cookies.set("classflow_session", token_a)
    assert stale.get("/auth/me").status_code == 401
    assert client.get("/auth/me").status_code == 200
    assert other.get("/auth/me").status_code == 200
    assert db_session.scalar(select(func.count()).select_from(SessionModel)) == 2


def test_failed_login_does_not_revoke_the_current_session(
    client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    insert_user(
        db_session,
        id="usr-manager",
        email=MANAGER_EMAIL,
        password_hash=manager_password_hash,
        role="manager",
    )
    login(client, MANAGER_EMAIL, MANAGER_PASSWORD)
    token = client.cookies.get("classflow_session")
    failed = client.post(
        "/auth/login",
        json={"email": MANAGER_EMAIL, "password": "wrong-password"},
    )
    assert failed.status_code == 401
    assert failed.json()["code"] == "invalid_credentials"
    assert client.cookies.get("classflow_session") == token
    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == MANAGER_EMAIL


def test_logout_is_idempotent(client: TestClient) -> None:
    assert client.post("/auth/logout").status_code == 204


def test_login_body_rejects_unknown_fields(client: TestClient) -> None:
    response = client.post(
        "/auth/login",
        json={"email": "a@localhost", "password": "secret", "role": "manager"},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "unprocessable_entity"
