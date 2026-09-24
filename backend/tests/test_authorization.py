"""
Manager writes and teacher isolation. The teacher id comes from the session,
not from a query parameter or a request body role.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from tests.conftest import MANAGER_PASSWORD, insert_user, login

DAV_LESSON = {
    "date": "2026-09-14",
    "startMin": 1080,
    "endMin": 1140,
    "classGroupId": "ot-lp12b01b",
    "roomId": "ot-03-205",
    "teacherId": "t-dav",
    "curriculum": "David's lesson",
    "status": "scheduled",
}

MIR_LESSON = {
    "date": "2026-09-14",
    "startMin": 900,
    "endMin": 960,
    "classGroupId": "fli-3c3",
    "roomId": "fli-06-108",
    "teacherId": "t-mir",
    "curriculum": "Mira's lesson",
    "status": "scheduled",
}


def _teacher_client(
    db_session: Session, password_hash: str, *, user_id: str, email: str, teacher_id: str
) -> TestClient:
    insert_user(
        db_session,
        id=user_id,
        email=email,
        password_hash=password_hash,
        role="teacher",
        teacher_id=teacher_id,
    )
    client = TestClient(app)
    login(client, email, MANAGER_PASSWORD)
    return client


def test_manager_reads_the_full_schedule(seeded_client: TestClient) -> None:
    seeded_client.post("/lessons", json=DAV_LESSON)
    seeded_client.post("/lessons", json=MIR_LESSON)
    teacher_ids = {lesson["teacherId"] for lesson in seeded_client.get("/lessons").json()}
    assert teacher_ids == {"t-dav", "t-mir"}
    assert len(seeded_client.get("/schools").json()) == 4
    assert len(seeded_client.get("/teachers").json()) == 6


def test_manager_can_edit_move_status_delete_and_import(seeded_client: TestClient) -> None:
    created = seeded_client.post("/lessons", json=DAV_LESSON).json()
    lesson_id = created["id"]
    assert (
        seeded_client.patch(f"/lessons/{lesson_id}", json={"curriculum": "Edited"}).status_code
        == 200
    )
    assert (
        seeded_client.patch(
            f"/lessons/{lesson_id}/reschedule",
            json={"date": "2026-09-15", "startMin": 600, "endMin": 660},
        ).status_code
        == 200
    )
    assert (
        seeded_client.patch(
            f"/lessons/{lesson_id}/status", json={"status": "cancelled"}
        ).status_code
        == 200
    )
    assert seeded_client.delete(f"/lessons/{lesson_id}").status_code == 204
    imported = seeded_client.post("/lessons/import", json=[MIR_LESSON])
    assert imported.status_code == 201
    assert len(imported.json()) == 1


def test_teacher_receives_only_own_lessons_and_linked_reference_rows(
    seeded_client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    seeded_client.post("/lessons", json=DAV_LESSON)
    seeded_client.post("/lessons", json=MIR_LESSON)
    david = _teacher_client(
        db_session,
        manager_password_hash,
        user_id="usr-dav",
        email="dav@localhost",
        teacher_id="t-dav",
    )
    mira = _teacher_client(
        db_session,
        manager_password_hash,
        user_id="usr-mir",
        email="mir@localhost",
        teacher_id="t-mir",
    )

    david_lessons = david.get("/lessons?teacherId=t-mir").json()
    assert [lesson["teacherId"] for lesson in david_lessons] == ["t-dav"]
    assert [lesson["teacherId"] for lesson in mira.get("/lessons").json()] == ["t-mir"]

    assert david.get("/teachers").json() == [
        {
            "id": "t-dav",
            "code": "DAV",
            "name": "David Okafor",
            "category": "native",
            "usdRate": 22.0,
        }
    ]
    assert {school["id"] for school in david.get("/schools").json()} == {"ot"}
    assert {school["id"] for school in mira.get("/schools").json()} == {"fli"}
    assert {room["id"] for room in david.get("/rooms").json()} == {"ot-03-205"}
    assert {room["id"] for room in mira.get("/rooms").json()} == {"fli-06-108"}
    assert {campus["id"] for campus in david.get("/campuses").json()} == {"ot-03"}
    assert {group["id"] for group in david.get("/class-groups").json()} == {"ot-lp12b01b"}

    me = david.get("/auth/me").json()
    assert me["teacher"] == {"id": "t-dav", "code": "DAV", "name": "David Okafor"}
    assert "usdRate" not in me["teacher"]
    assert david.get("/fx-rate").json()["vndPerUsd"] == seeded_client.get("/fx-rate").json()["vndPerUsd"]


def test_teacher_with_no_lessons_gets_empty_reference_lists(
    seeded_client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    leo = _teacher_client(
        db_session,
        manager_password_hash,
        user_id="usr-leo",
        email="leo@localhost",
        teacher_id="t-leo",
    )
    assert leo.get("/lessons").json() == []
    assert leo.get("/schools").json() == []
    assert leo.get("/rooms").json() == []
    assert leo.get("/teachers").json()[0]["id"] == "t-leo"


def test_teacher_mutations_are_forbidden(
    seeded_client: TestClient, db_session: Session, manager_password_hash: str
) -> None:
    created = seeded_client.post("/lessons", json=DAV_LESSON).json()
    teacher = _teacher_client(
        db_session,
        manager_password_hash,
        user_id="usr-dav",
        email="dav@localhost",
        teacher_id="t-dav",
    )
    lesson_id = created["id"]
    attempts = [
        teacher.post("/lessons", json=MIR_LESSON),
        teacher.patch(f"/lessons/{lesson_id}", json={"curriculum": "nope"}),
        teacher.patch(
            f"/lessons/{lesson_id}/reschedule",
            json={"date": "2026-09-16", "startMin": 600, "endMin": 660},
        ),
        teacher.patch(f"/lessons/{lesson_id}/status", json={"status": "cancelled"}),
        teacher.delete(f"/lessons/{lesson_id}"),
        teacher.post("/lessons/import", json=[MIR_LESSON]),
        teacher.delete("/lessons/does-not-exist"),
    ]
    assert [response.status_code for response in attempts] == [403] * len(attempts)
    for response in attempts:
        assert response.json()["code"] == "forbidden"
