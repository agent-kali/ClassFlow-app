"""Authenticated and public API responses must not be shared-cacheable."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import MANAGER_EMAIL, MANAGER_PASSWORD

NO_STORE = "private, no-store"


def test_anonymous_auth_responses_are_private(
    client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    from tests.conftest import insert_user

    insert_user(
        db_session,
        id="usr-manager",
        email=MANAGER_EMAIL,
        password_hash=manager_password_hash,
        role="manager",
    )
    anonymous = client.get("/auth/me")
    assert anonymous.status_code == 401
    assert anonymous.headers["cache-control"] == NO_STORE

    login = client.post(
        "/auth/login",
        json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
    )
    assert login.status_code == 200
    assert login.headers["cache-control"] == NO_STORE

    logout = client.post("/auth/logout")
    assert logout.status_code == 204
    assert logout.headers["cache-control"] == NO_STORE


def test_schedule_responses_are_private(authenticated_client: TestClient) -> None:
    me = authenticated_client.get("/auth/me")
    assert me.status_code == 200
    assert me.headers["cache-control"] == NO_STORE

    for path in ("/lessons", "/teachers", "/schools", "/fx-rate"):
        response = authenticated_client.get(path)
        assert response.status_code == 200, path
        assert response.headers["cache-control"] == NO_STORE, path
