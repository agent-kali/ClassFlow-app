"""
The reference resources the manager schedule reads before it can render a
lesson: without these, a lesson block has no class code, room, or teacher.
"""

from fastapi.testclient import TestClient


def test_health_needs_no_database(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_schools_come_from_the_database(seeded_client: TestClient) -> None:
    response = seeded_client.get("/schools")
    assert response.status_code == 200
    schools = response.json()
    assert len(schools) == 4
    by_id = {school["id"]: school for school in schools}
    assert by_id["ot"] == {
        "id": "ot",
        "name": "Outeref",
        "shortName": "OT",
        "district": "District 3",
        "color": "teal",
        "hasClassManagers": True,
    }
    # Whether a school staffs class managers drives a field in the new-lesson form.
    assert by_id["sy"]["hasClassManagers"] is False


def test_campuses_come_from_the_database(seeded_client: TestClient) -> None:
    campuses = seeded_client.get("/campuses").json()
    assert len(campuses) == 5
    by_id = {campus["id"]: campus for campus in campuses}
    assert by_id["ot-03"] == {
        "id": "ot-03",
        "schoolId": "ot",
        "name": "OT03",
        "address": "12 Nguyen Dinh Chieu, District 3",
    }


def test_rooms_come_from_the_database(seeded_client: TestClient) -> None:
    rooms = seeded_client.get("/rooms").json()
    assert len(rooms) == 16
    by_id = {room["id"]: room for room in rooms}
    assert by_id["ot-03-205"] == {
        "id": "ot-03-205",
        "campusId": "ot-03",
        "name": "205",
    }


def test_class_groups_come_from_the_database(seeded_client: TestClient) -> None:
    groups = seeded_client.get("/class-groups").json()
    assert len(groups) == 15
    by_id = {group["id"]: group for group in groups}
    assert by_id["ot-lp12b01b"] == {
        "id": "ot-lp12b01b",
        "schoolId": "ot",
        "code": "LP12B01B",
        "program": "Little Pioneers",
        "level": "Primary 12B",
    }


def test_teachers_come_from_the_database(seeded_client: TestClient) -> None:
    teachers = seeded_client.get("/teachers").json()
    assert len(teachers) == 6
    by_id = {teacher["id"]: teacher for teacher in teachers}
    assert by_id["t-dav"] == {
        "id": "t-dav",
        "code": "DAV",
        "name": "David Okafor",
        "category": "native",
        "usdRate": 22.0,
    }
    # Fractional rates must survive the Numeric column; pay is derived from them.
    assert by_id["t-oli"]["usdRate"] == 23.5


def test_teachers_are_empty_without_rows(client: TestClient) -> None:
    assert client.get("/teachers").json() == []


def test_reference_lists_are_deterministically_ordered(
    seeded_client: TestClient,
) -> None:
    rooms = [room["id"] for room in seeded_client.get("/rooms").json()]
    assert rooms == sorted(rooms)
    codes = [teacher["code"] for teacher in seeded_client.get("/teachers").json()]
    assert codes == sorted(codes)


def test_fx_rate_is_a_single_captured_rate(client: TestClient) -> None:
    response = client.get("/fx-rate")
    assert response.status_code == 200
    body = response.json()
    assert body["vndPerUsd"] == 26150.0
    assert body["source"] == "Vietcombank spot"
    assert len(body["capturedOn"]) == 10  # YYYY-MM-DD
