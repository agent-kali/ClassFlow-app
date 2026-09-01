from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TEACHER_KEYS = {"id", "code", "name", "category", "usdRate"}
ALLOWED_CATEGORIES = {"native", "non-native", "esl"}

EXPECTED_TEACHERS = [
    {"id": "t-dav", "code": "DAV", "name": "David Okafor", "category": "native", "usdRate": 22},
    {"id": "t-oli", "code": "OLI", "name": "Oliver Grant", "category": "native", "usdRate": 23.5},
    {"id": "t-mir", "code": "MIR", "name": "Mira Novak", "category": "non-native", "usdRate": 17.5},
    {"id": "t-leo", "code": "LEO", "name": "Leo Martins", "category": "non-native", "usdRate": 18},
    {"id": "t-tam", "code": "TAM", "name": "Tamara Reyes", "category": "esl", "usdRate": 16},
    {"id": "t-kat", "code": "KAT", "name": "Katya Orlova", "category": "esl", "usdRate": 15.5},
]


def test_teachers_returns_fixture_list() -> None:
    response = client.get("/teachers")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]

    payload = response.json()
    assert payload == EXPECTED_TEACHERS
    assert len(payload) == 6

    for teacher in payload:
        assert set(teacher.keys()) == TEACHER_KEYS
        assert teacher["category"] in ALLOWED_CATEGORIES
        assert isinstance(teacher["usdRate"], (int, float))
        assert not isinstance(teacher["usdRate"], bool)
