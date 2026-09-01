import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas import Lesson

client = TestClient(app)

EXPECTED_LESSONS = [
    {
        "id": "ls-001",
        "date": "2026-08-31",
        "startMin": 470,
        "endMin": 505,
        "classGroupId": "fli-3c3",
        "roomId": "fli-06-108",
        "teacherId": "t-tam",
        "cmName": "Ms Hoa",
        "curriculum": "Family & Friends 3: U4 pp.30–31",
        "weekCode": "W12",
        "status": "scheduled",
    },
    {
        "id": "ls-004",
        "date": "2026-08-31",
        "startMin": 930,
        "endMin": 975,
        "classGroupId": "sy-sj3",
        "roomId": "sy-03-203",
        "teacherId": "t-kat",
        "curriculum": "Speaking: classroom objects",
        "status": "scheduled",
    },
    {
        "id": "ls-025",
        "date": "2026-09-02",
        "startMin": 1150,
        "endMin": 1210,
        "classGroupId": "ot-lp09a02a",
        "roomId": "ot-03-201",
        "teacherId": "t-mir",
        "cmName": "PTM",
        "curriculum": "Prepare 3: U12 pp.74–75",
        "weekCode": "W6D3",
        "status": "cancelled",
    },
    {
        "id": "ls-036",
        "date": "2026-09-04",
        "startMin": 930,
        "endMin": 975,
        "classGroupId": "sy-sj5",
        "roomId": "sy-03-203",
        "teacherId": "t-leo",
        "curriculum": "Project: my neighbourhood — presentations",
        "status": "no-show",
    },
    {
        "id": "ls-038",
        "date": "2026-09-04",
        "startMin": 1050,
        "endMin": 1120,
        "classGroupId": "ot-tn07b01c",
        "roomId": "ot-17-103",
        "teacherId": "t-mir",
        "cmName": "LVA",
        "curriculum": "Prepare 4: U11 Grammar — present perfect",
        "weekCode": "W6D4",
        "status": "scheduled",
        "movedFrom": {"date": "2026-09-03", "startMin": 1050},
    },
    {
        "id": "ls-009",
        "date": "2026-08-31",
        "startMin": 1170,
        "endMin": 1260,
        "classGroupId": "ld-il401",
        "roomId": "ld-07-401",
        "teacherId": "t-oli",
        "curriculum": "Writing Task 2: opinion essays — model + timed drill",
        "weekCode": "D7",
        "status": "scheduled",
    },
]

VALID_LESSON = {
    "id": "ls-test",
    "date": "2026-08-31",
    "startMin": 470,
    "endMin": 505,
    "classGroupId": "fli-3c3",
    "roomId": "fli-06-108",
    "teacherId": "t-tam",
    "curriculum": "Family & Friends 3: U4 pp.30–31",
    "status": "scheduled",
}


def test_lessons_returns_fixture_list() -> None:
    response = client.get("/lessons")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    assert response.json() == EXPECTED_LESSONS


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
    ],
)
def test_lesson_model_rejects_invalid(patch: dict) -> None:
    with pytest.raises(ValidationError):
        Lesson.model_validate({**VALID_LESSON, **patch})
