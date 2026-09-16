"""
Wire-schema rules for lessons, independent of HTTP and the database.

Endpoint behaviour lives in test_lessons_api.py; this file pins the value
formats docs/api-contract.md defines.
"""

import pytest
from pydantic import ValidationError

from app.schemas import Lesson, LessonCreate, LessonPatch, RescheduleLessonBody

VALID_LESSON = {
    "id": "ls-test",
    "date": "2026-08-31",
    "startMin": 470,
    "endMin": 505,
    "classGroupId": "fli-3c3",
    "roomId": "fli-06-108",
    "teacherId": "t-tam",
    "curriculum": "Family & Friends 3: U4 pp.30\u201331",
    "status": "scheduled",
}
VALID_INPUT = {key: value for key, value in VALID_LESSON.items() if key != "id"}


def test_lesson_accepts_camel_case_wire_format() -> None:
    lesson = Lesson.model_validate(VALID_LESSON)
    assert lesson.start_min == 470
    assert lesson.end_min == 505
    assert lesson.class_group_id == "fli-3c3"


def test_lesson_serializes_back_to_camel_case() -> None:
    dumped = Lesson.model_validate(VALID_LESSON).model_dump(
        by_alias=True, exclude_none=True
    )
    assert dumped == VALID_LESSON


def test_lesson_keeps_minute_offsets_as_integers() -> None:
    lesson = Lesson.model_validate({**VALID_LESSON, "startMin": 0, "endMin": 1440})
    assert lesson.start_min == 0
    assert lesson.end_min == 1440


def test_moved_from_round_trips() -> None:
    lesson = Lesson.model_validate(
        {**VALID_LESSON, "movedFrom": {"date": "2026-08-30", "startMin": 1050}}
    )
    assert lesson.moved_from is not None
    assert lesson.moved_from.date == "2026-08-30"
    assert lesson.moved_from.start_min == 1050


@pytest.mark.parametrize(
    "patch",
    [
        {"date": "31-08-2026"},
        {"date": "2026/08/31"},
        {"date": "2026-02-30"},
        {"startMin": -1},
        {"startMin": 1440},
        {"endMin": 0},
        {"endMin": 1441},
        {"startMin": 500, "endMin": 500},
        {"startMin": 600, "endMin": 500},
        {"startMin": 10.5},
        {"status": "done"},
        {"notes": "extra"},
        {"movedFrom": {"date": "2026-08-31", "startMin": 0, "notes": "extra"}},
        {"movedFrom": {"date": "2026-08-31", "startMin": 1440}},
        {"cmName": None},
        {"weekCode": None},
        {"movedFrom": None},
    ],
)
def test_lesson_rejects_invalid(patch: dict) -> None:
    with pytest.raises(ValidationError):
        Lesson.model_validate({**VALID_LESSON, **patch})


def test_lesson_requires_id() -> None:
    with pytest.raises(ValidationError):
        Lesson.model_validate(VALID_INPUT)


def test_lesson_create_is_lesson_without_id() -> None:
    created = LessonCreate.model_validate(VALID_INPUT)
    assert created.curriculum == VALID_LESSON["curriculum"]
    with pytest.raises(ValidationError):
        LessonCreate.model_validate(VALID_LESSON)


@pytest.mark.parametrize("field", ["date", "startMin", "endMin", "classGroupId",
                                   "roomId", "teacherId", "curriculum", "status"])
def test_lesson_create_requires_every_non_optional_field(field: str) -> None:
    body = {key: value for key, value in VALID_INPUT.items() if key != field}
    with pytest.raises(ValidationError):
        LessonCreate.model_validate(body)


def test_lesson_patch_allows_an_empty_object() -> None:
    patch = LessonPatch.model_validate({})
    assert patch.model_dump(exclude_unset=True) == {}


def test_lesson_patch_tracks_only_provided_fields() -> None:
    patch = LessonPatch.model_validate({"curriculum": "Changed"})
    assert patch.model_dump(exclude_unset=True) == {"curriculum": "Changed"}


def test_lesson_patch_allows_one_side_of_the_time_pair() -> None:
    """Merged-row validation happens in app.lessons, not in the schema."""
    patch = LessonPatch.model_validate({"startMin": 600})
    assert patch.start_min == 600
    assert patch.end_min is None


@pytest.mark.parametrize(
    "patch",
    [
        {"notes": "extra"},
        {"status": "done"},
        {"date": "31-08-2026"},
        {"startMin": 1440},
        {"curriculum": None},
        {"cmName": None},
        {"movedFrom": None},
    ],
)
def test_lesson_patch_rejects_invalid(patch: dict) -> None:
    with pytest.raises(ValidationError):
        LessonPatch.model_validate(patch)


def test_reschedule_body_requires_ordered_times() -> None:
    body = RescheduleLessonBody.model_validate(
        {"date": "2026-08-31", "startMin": 600, "endMin": 660}
    )
    assert body.start_min == 600
    with pytest.raises(ValidationError):
        RescheduleLessonBody.model_validate(
            {"date": "2026-08-31", "startMin": 660, "endMin": 600}
        )
