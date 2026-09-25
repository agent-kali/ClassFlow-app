"""
Integration coverage for the manager lesson lifecycle against real PostgreSQL.

Every test here goes through HTTP and a live database, so a passing run means
the schedule a manager sees is genuinely what Postgres holds.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

NEW_LESSON = {
    "date": "2026-09-14",
    "startMin": 1080,  # 18:00
    "endMin": 1140,  # 19:00
    "classGroupId": "ot-lp12b01b",
    "roomId": "ot-03-205",
    "teacherId": "t-dav",
    "curriculum": "Prepare 5: U15 pp.88-89",
    "status": "scheduled",
}


def _create(client: TestClient, **overrides: object) -> dict:
    response = client.post("/lessons", json={**NEW_LESSON, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


# ---------------------------------------------------------------- reads


def test_lessons_list_is_empty_without_rows(seeded_client: TestClient) -> None:
    """An empty schedule is [] with 200 — never a 404, never fixtures."""
    response = seeded_client.get("/lessons")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    assert response.json() == []


def test_lessons_list_returns_created_rows(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    listed = seeded_client.get("/lessons").json()
    assert listed == [created]


def test_lesson_omits_absent_optionals(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    assert "cmName" not in created
    assert "weekCode" not in created
    assert "movedFrom" not in created


def test_lesson_round_trips_optionals(seeded_client: TestClient) -> None:
    created = _create(seeded_client, cmName="DHT", weekCode="W6D1")
    assert created["cmName"] == "DHT"
    assert created["weekCode"] == "W6D1"


# ---------------------------------------------------------------- create


def test_create_returns_201_and_generated_id(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    assert created["id"].startswith("ls-")
    assert created["date"] == "2026-09-14"
    assert created["startMin"] == 1080
    assert created["endMin"] == 1140
    assert created["status"] == "scheduled"


def test_create_assigns_distinct_ids(seeded_client: TestClient) -> None:
    first = _create(seeded_client)
    second = _create(seeded_client)
    assert first["id"] != second["id"]


def test_create_preserves_wall_clock_date_and_minutes(seeded_client: TestClient) -> None:
    """No UTC conversion: the stored row is the local date the manager picked."""
    created = _create(seeded_client, date="2026-12-31", startMin=0, endMin=1440)
    assert created["date"] == "2026-12-31"
    assert created["startMin"] == 0
    assert created["endMin"] == 1440


# ---------------------------------------------------------------- update


def test_update_returns_updated_lesson(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(
        f"/lessons/{created['id']}",
        json={"curriculum": "Prepare 5: U16 pp.92-93", "teacherId": "t-oli"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["curriculum"] == "Prepare 5: U16 pp.92-93"
    assert body["teacherId"] == "t-oli"
    assert body["id"] == created["id"]


def test_update_persists(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    seeded_client.patch(f"/lessons/{created['id']}", json={"curriculum": "Changed"})
    listed = seeded_client.get("/lessons").json()
    assert listed[0]["curriculum"] == "Changed"


def test_update_does_not_invent_moved_from(seeded_client: TestClient) -> None:
    """PATCH applies the patch as given; the caller owns move semantics."""
    created = _create(seeded_client)
    body = seeded_client.patch(
        f"/lessons/{created['id']}", json={"date": "2026-09-16"}
    ).json()
    assert body["date"] == "2026-09-16"
    assert "movedFrom" not in body


def test_update_accepts_explicit_moved_from(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    body = seeded_client.patch(
        f"/lessons/{created['id']}",
        json={
            "date": "2026-09-16",
            "movedFrom": {"date": "2026-09-14", "startMin": 1080},
        },
    ).json()
    assert body["movedFrom"] == {"date": "2026-09-14", "startMin": 1080}


def test_empty_patch_is_a_no_op(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(f"/lessons/{created['id']}", json={})
    assert response.status_code == 200
    assert response.json() == created


# ---------------------------------------------------------------- status


@pytest.mark.parametrize("status_value", ["cancelled", "no-show", "scheduled"])
def test_set_status(seeded_client: TestClient, status_value: str) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(
        f"/lessons/{created['id']}/status", json={"status": status_value}
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == status_value
    assert seeded_client.get("/lessons").json()[0]["status"] == status_value


def test_status_change_keeps_lesson_visible(seeded_client: TestClient) -> None:
    """Cancelled lessons stay on the schedule; only pay excludes them."""
    created = _create(seeded_client)
    seeded_client.patch(f"/lessons/{created['id']}/status", json={"status": "cancelled"})
    listed = seeded_client.get("/lessons").json()
    assert len(listed) == 1
    assert listed[0]["id"] == created["id"]


def test_status_rejects_unknown_value(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(
        f"/lessons/{created['id']}/status", json={"status": "done"}
    )
    assert response.status_code == 422
    assert response.json()["code"] == "unprocessable_entity"


# ---------------------------------------------------------------- reschedule


def test_reschedule_records_origin(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(
        f"/lessons/{created['id']}/reschedule",
        json={"date": "2026-09-16", "startMin": 1110, "endMin": 1170},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["date"] == "2026-09-16"
    assert body["startMin"] == 1110
    assert body["endMin"] == 1170
    assert body["movedFrom"] == {"date": "2026-09-14", "startMin": 1080}


def test_reschedule_twice_keeps_first_origin(seeded_client: TestClient) -> None:
    """The move is measured from where it started, not the latest hop."""
    created = _create(seeded_client)
    seeded_client.patch(
        f"/lessons/{created['id']}/reschedule",
        json={"date": "2026-09-16", "startMin": 1110, "endMin": 1170},
    )
    second = seeded_client.patch(
        f"/lessons/{created['id']}/reschedule",
        json={"date": "2026-09-18", "startMin": 600, "endMin": 660},
    ).json()
    assert second["date"] == "2026-09-18"
    assert second["movedFrom"] == {"date": "2026-09-14", "startMin": 1080}


def test_reschedule_persists_origin(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    seeded_client.patch(
        f"/lessons/{created['id']}/reschedule",
        json={"date": "2026-09-16", "startMin": 1110, "endMin": 1170},
    )
    listed = seeded_client.get("/lessons").json()
    assert listed[0]["movedFrom"] == {"date": "2026-09-14", "startMin": 1080}


def test_reschedule_rejects_inverted_times(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(
        f"/lessons/{created['id']}/reschedule",
        json={"date": "2026-09-16", "startMin": 600, "endMin": 600},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------- delete


def test_delete_returns_204_and_no_body(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.delete(f"/lessons/{created['id']}")
    assert response.status_code == 204
    assert response.content == b""


def test_delete_removes_from_schedule(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    seeded_client.delete(f"/lessons/{created['id']}")
    assert seeded_client.get("/lessons").json() == []


def test_delete_only_removes_the_target(seeded_client: TestClient) -> None:
    keep = _create(seeded_client, curriculum="Keep me")
    remove = _create(seeded_client, curriculum="Remove me")
    seeded_client.delete(f"/lessons/{remove['id']}")
    listed = seeded_client.get("/lessons").json()
    assert [lesson["id"] for lesson in listed] == [keep["id"]]


def test_delete_twice_is_404(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    assert seeded_client.delete(f"/lessons/{created['id']}").status_code == 204
    repeat = seeded_client.delete(f"/lessons/{created['id']}")
    assert repeat.status_code == 404
    assert repeat.json()["code"] == "not_found"


# ---------------------------------------------------------------- import


def test_import_creates_every_row(seeded_client: TestClient) -> None:
    payload = [
        {**NEW_LESSON, "curriculum": "First"},
        {**NEW_LESSON, "curriculum": "Second", "startMin": 1200, "endMin": 1260},
    ]
    response = seeded_client.post("/lessons/import", json=payload)
    assert response.status_code == 201, response.text
    created = response.json()
    assert len(created) == 2
    assert {lesson["curriculum"] for lesson in created} == {"First", "Second"}
    assert len(seeded_client.get("/lessons").json()) == 2


def test_import_is_atomic_on_invalid_element(seeded_client: TestClient) -> None:
    payload = [
        {**NEW_LESSON, "curriculum": "Valid"},
        {**NEW_LESSON, "curriculum": "Invalid", "endMin": 5},
    ]
    response = seeded_client.post("/lessons/import", json=payload)
    assert response.status_code == 422
    assert seeded_client.get("/lessons").json() == []


def test_import_empty_batch(seeded_client: TestClient) -> None:
    response = seeded_client.post("/lessons/import", json=[])
    assert response.status_code == 201
    assert response.json() == []


# ---------------------------------------------------------------- 404


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("patch", "/lessons/ls-missing", {"curriculum": "x"}),
        ("patch", "/lessons/ls-missing/status", {"status": "cancelled"}),
        (
            "patch",
            "/lessons/ls-missing/reschedule",
            {"date": "2026-09-16", "startMin": 600, "endMin": 660},
        ),
        ("delete", "/lessons/ls-missing", None),
    ],
)
def test_mutations_on_unknown_id_are_404(
    seeded_client: TestClient, method: str, path: str, body: dict | None
) -> None:
    call = getattr(seeded_client, method)
    response = call(path) if body is None else call(path, json=body)
    assert response.status_code == 404
    assert response.json() == {
        "status": 404,
        "code": "not_found",
        "message": "Lesson not found.",
        "resource": "Lesson",
        "id": "ls-missing",
    }


# ---------------------------------------------------------------- 422


@pytest.mark.parametrize(
    "patch",
    [
        {"date": "31-08-2026"},
        {"date": "2026/08/31"},
        {"startMin": -1},
        {"startMin": 1440},
        {"endMin": 0},
        {"endMin": 1441},
        {"startMin": 500, "endMin": 500},
        {"startMin": 600, "endMin": 500},
        {"status": "done"},
        {"notes": "extra"},
        {"movedFrom": {"date": "2026-08-31", "startMin": 0, "notes": "extra"}},
        {"cmName": None},
        {"weekCode": None},
        {"movedFrom": None},
        {"startMin": 10.5},
    ],
)
def test_create_rejects_invalid_body(seeded_client: TestClient, patch: dict) -> None:
    response = seeded_client.post("/lessons", json={**NEW_LESSON, **patch})
    assert response.status_code == 422
    body = response.json()
    assert body["status"] == 422
    assert body["code"] == "unprocessable_entity"
    assert isinstance(body["message"], str) and body["message"]


def test_patch_rejects_unknown_field(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(f"/lessons/{created['id']}", json={"notes": "x"})
    assert response.status_code == 422


def test_patch_rejects_inverted_times_against_stored_row(
    seeded_client: TestClient,
) -> None:
    """Only one side of the pair is sent, so the merged row must be validated."""
    created = _create(seeded_client)  # 1080 -> 1140
    response = seeded_client.patch(f"/lessons/{created['id']}", json={"startMin": 1200})
    assert response.status_code == 422
    body = response.json()
    assert body["field"] == "endMin"
    assert seeded_client.get("/lessons").json()[0]["startMin"] == 1080


def test_validation_error_reports_field(seeded_client: TestClient) -> None:
    response = seeded_client.post("/lessons", json={**NEW_LESSON, "startMin": 2000})
    assert response.status_code == 422
    assert response.json()["field"] == "startMin"


# ------------------------------------------------- reference integrity


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("teacherId", "t-nobody"),
        ("roomId", "room-nowhere"),
        ("classGroupId", "cg-nothing"),
    ],
)
def test_create_rejects_unknown_reference(
    seeded_client: TestClient, field: str, value: str
) -> None:
    response = seeded_client.post("/lessons", json={**NEW_LESSON, field: value})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "unprocessable_entity"
    assert body["field"] == field
    assert seeded_client.get("/lessons").json() == []


def test_patch_rejects_unknown_reference(seeded_client: TestClient) -> None:
    created = _create(seeded_client)
    response = seeded_client.patch(
        f"/lessons/{created['id']}", json={"teacherId": "t-nobody"}
    )
    assert response.status_code == 422
    assert seeded_client.get("/lessons").json()[0]["teacherId"] == "t-dav"


def test_foreign_keys_are_enforced_by_the_database(reference_data: Session) -> None:
    """The 422 above is a courtesy; the FK is the real guarantee."""
    from sqlalchemy.exc import IntegrityError

    from app.models import LessonModel

    reference_data.add(
        LessonModel(
            id="ls-fk-probe",
            date="2026-09-14",
            start_min=600,
            end_min=660,
            class_group_id="ot-lp12b01b",
            room_id="ot-03-205",
            teacher_id="t-nobody",
            curriculum="Should not insert",
            status="scheduled",
        )
    )
    with pytest.raises(IntegrityError):
        reference_data.flush()


# ------------------------------------------------- conflicts are warnings


def test_overlapping_lessons_for_one_teacher_are_accepted(
    seeded_client: TestClient,
) -> None:
    """Double bookings are a read-side warning, never a rejected write."""
    first = _create(seeded_client, startMin=1080, endMin=1140)
    second = seeded_client.post(
        "/lessons",
        json={**NEW_LESSON, "startMin": 1110, "endMin": 1170, "roomId": "ot-03-302"},
    )
    assert second.status_code == 201, second.text
    listed = seeded_client.get("/lessons").json()
    assert len(listed) == 2
    assert first["id"] in {lesson["id"] for lesson in listed}


def test_overlapping_room_bookings_are_accepted(seeded_client: TestClient) -> None:
    _create(seeded_client, startMin=1080, endMin=1140)
    response = seeded_client.post(
        "/lessons",
        json={**NEW_LESSON, "startMin": 1110, "endMin": 1170, "teacherId": "t-oli"},
    )
    assert response.status_code == 201
    assert len(seeded_client.get("/lessons").json()) == 2


def test_reschedule_into_an_overlap_is_accepted(seeded_client: TestClient) -> None:
    _create(seeded_client, startMin=1080, endMin=1140)
    other = _create(seeded_client, startMin=600, endMin=660, roomId="ot-03-302")
    response = seeded_client.patch(
        f"/lessons/{other['id']}/reschedule",
        json={"date": "2026-09-14", "startMin": 1090, "endMin": 1150},
    )
    assert response.status_code == 200
    assert response.status_code != 409


def test_identical_lessons_are_both_persisted(seeded_client: TestClient) -> None:
    """No uniqueness constraint on teacher, room or time."""
    first = _create(seeded_client)
    second = _create(seeded_client)
    assert first["id"] != second["id"]
    assert len(seeded_client.get("/lessons").json()) == 2


# ------------------------------------------------- durability


def test_lesson_survives_in_a_separate_database_session(
    committing_client: TestClient, database_url: str
) -> None:
    """
    The acceptance criterion behind a browser refresh: a committed lesson is
    readable by a brand-new connection that knows nothing about the request.
    """
    created = committing_client.post("/lessons", json=NEW_LESSON)
    assert created.status_code == 201, created.text
    lesson_id = created.json()["id"]

    independent = create_engine(database_url)
    try:
        with independent.connect() as connection:
            row = connection.execute(
                text(
                    "select id, date, start_min, end_min, curriculum, status "
                    "from lessons where id = :id"
                ),
                {"id": lesson_id},
            ).one()
        assert row.curriculum == NEW_LESSON["curriculum"]
        assert row.start_min == 1080
        assert row.end_min == 1140
        assert row.date.isoformat() == "2026-09-14"
        assert row.status == "scheduled"

        # A second, independent HTTP request sees it too.
        listed = committing_client.get("/lessons").json()
        assert lesson_id in {lesson["id"] for lesson in listed}
    finally:
        independent.dispose()


def test_delete_is_durable_across_sessions(
    committing_client: TestClient, database_url: str
) -> None:
    created = committing_client.post("/lessons", json=NEW_LESSON).json()
    assert committing_client.delete(f"/lessons/{created['id']}").status_code == 204

    independent = create_engine(database_url)
    try:
        with independent.connect() as connection:
            count = connection.execute(
                text("select count(*) from lessons where id = :id"),
                {"id": created["id"]},
            ).scalar_one()
        assert count == 0
    finally:
        independent.dispose()


def test_reschedule_is_durable_across_sessions(
    committing_client: TestClient, database_url: str
) -> None:
    created = committing_client.post("/lessons", json=NEW_LESSON).json()
    committing_client.patch(
        f"/lessons/{created['id']}/reschedule",
        json={"date": "2026-09-16", "startMin": 1110, "endMin": 1170},
    )

    independent = create_engine(database_url)
    try:
        with independent.connect() as connection:
            row = connection.execute(
                text(
                    "select date, start_min, moved_from_date, moved_from_start_min "
                    "from lessons where id = :id"
                ),
                {"id": created["id"]},
            ).one()
        assert row.date.isoformat() == "2026-09-16"
        assert row.start_min == 1110
        assert row.moved_from_date.isoformat() == "2026-09-14"
        assert row.moved_from_start_min == 1080
    finally:
        independent.dispose()


# ------------------------------------------------- transaction boundary


def test_db_routes_use_function_scoped_get_db() -> None:
    """
    get_db() commits after yield. FastAPI's default request-scoped yield
    teardown runs after the HTTP body is sent, so a 201 could outrun a
    failed commit. Function scope closes that window.
    """
    from fastapi.routing import APIRoute

    from app.db import get_db
    from app.main import app

    db_routes: list[str] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for dep in route.dependant.dependencies:
            if dep.call is get_db:
                db_routes.append(route.path)
                assert dep.scope == "function", (
                    f"{sorted(route.methods)} {route.path} injects get_db "
                    "without function scope"
                )
    assert db_routes


def test_get_db_commits_before_the_http_response_starts(
    committing_client: TestClient,
) -> None:
    from collections.abc import Awaitable, Callable, MutableMapping
    from typing import Any
    from unittest.mock import patch

    events: list[str] = []
    fastapi_app = committing_client.app

    async def observing_app(
        scope: MutableMapping[str, Any],
        receive: Callable[[], Awaitable[MutableMapping[str, Any]]],
        send: Callable[[MutableMapping[str, Any]], Awaitable[None]],
    ) -> None:
        async def tracked_send(message: MutableMapping[str, Any]) -> None:
            if message["type"] == "http.response.start":
                events.append("response.start")
            await send(message)

        await fastapi_app(scope, receive, tracked_send)

    original_commit = Session.commit

    def tracked_commit(self: Session, *args: object, **kwargs: object) -> None:
        events.append("commit")
        original_commit(self, *args, **kwargs)

    with patch.object(Session, "commit", tracked_commit):
        with TestClient(observing_app) as client:
            client.cookies.update(committing_client.cookies)
            response = client.post("/lessons", json=NEW_LESSON)

    assert response.status_code == 201, response.text
    start_at = events.index("response.start")
    assert "commit" in events[:start_at]
    assert "commit" not in events[start_at:]
