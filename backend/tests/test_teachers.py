"""
Wire-schema rules for the reference resources, independent of HTTP and the
database. Endpoint behaviour lives in test_reference_api.py.
"""

import pytest
from pydantic import ValidationError

from app.schemas import Campus, ClassGroup, FxRate, Room, School, Teacher

VALID_TEACHER = {
    "id": "t-dav",
    "code": "DAV",
    "name": "David Okafor",
    "category": "native",
    "usdRate": 22,
}
VALID_SCHOOL = {
    "id": "ot",
    "name": "Outeref",
    "shortName": "OT",
    "district": "District 3",
    "color": "teal",
    "hasClassManagers": True,
}


def test_teacher_accepts_camel_case_wire_format() -> None:
    teacher = Teacher.model_validate(VALID_TEACHER)
    assert teacher.usd_rate == 22
    assert teacher.category.value == "native"


def test_teacher_serializes_back_to_camel_case() -> None:
    dumped = Teacher.model_validate(VALID_TEACHER).model_dump(by_alias=True)
    assert dumped["usdRate"] == 22
    assert set(dumped) == {"id", "code", "name", "category", "usdRate"}


def test_teacher_rate_keeps_fractions() -> None:
    """Pay is derived from this rate, so 23.5 must not round to 23."""
    assert Teacher.model_validate({**VALID_TEACHER, "usdRate": 23.5}).usd_rate == 23.5


@pytest.mark.parametrize(
    "patch",
    [
        {"category": "assistant"},
        {"usdRate": "not-a-number"},
        {"extra": "field"},
    ],
)
def test_teacher_rejects_invalid(patch: dict) -> None:
    with pytest.raises(ValidationError):
        Teacher.model_validate({**VALID_TEACHER, **patch})


def test_school_accepts_camel_case_wire_format() -> None:
    school = School.model_validate(VALID_SCHOOL)
    assert school.short_name == "OT"
    assert school.has_class_managers is True


@pytest.mark.parametrize(
    "patch",
    [
        {"color": "crimson"},
        {"extra": "field"},
        {"hasClassManagers": "maybe"},
    ],
)
def test_school_rejects_invalid(patch: dict) -> None:
    with pytest.raises(ValidationError):
        School.model_validate({**VALID_SCHOOL, **patch})


def test_campus_and_room_carry_their_parent_ids() -> None:
    campus = Campus.model_validate(
        {"id": "ot-03", "schoolId": "ot", "name": "OT03", "address": "12 Nguyen Dinh Chieu"}
    )
    assert campus.school_id == "ot"
    room = Room.model_validate({"id": "ot-03-205", "campusId": "ot-03", "name": "205"})
    assert room.campus_id == "ot-03"


def test_class_group_keeps_school_specific_code_grammar() -> None:
    """Codes are never normalised away: "LP12B01B" and "3C3" are both valid."""
    for code in ("LP12B01B", "FLYERS", "IL401", "3C3"):
        group = ClassGroup.model_validate(
            {
                "id": f"x-{code.lower()}",
                "schoolId": "ot",
                "code": code,
                "program": "Program",
                "level": "Level",
            }
        )
        assert group.code == code


def test_fx_rate_requires_an_iso_capture_date() -> None:
    rate = FxRate.model_validate(
        {"vndPerUsd": 26150, "capturedOn": "2026-09-15", "source": "Vietcombank spot"}
    )
    assert rate.vnd_per_usd == 26150
    with pytest.raises(ValidationError):
        FxRate.model_validate(
            {"vndPerUsd": 26150, "capturedOn": "15/09/2026", "source": "x"}
        )
