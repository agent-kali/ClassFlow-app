from datetime import date as Date
from enum import Enum
import re
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_OPTIONAL_WIRE_KEYS = (
    "cmName",
    "cm_name",
    "weekCode",
    "week_code",
    "movedFrom",
    "moved_from",
)


def _require_iso_date(value: object) -> str:
    if not isinstance(value, str) or _ISO_DATE.fullmatch(value) is None:
        raise ValueError("date must be YYYY-MM-DD")
    Date.fromisoformat(value)
    return value


class TeacherCategory(str, Enum):
    native = "native"
    non_native = "non-native"
    esl = "esl"


class Teacher(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    code: str
    name: str
    category: TeacherCategory
    usd_rate: float = Field(alias="usdRate")


class LessonStatus(str, Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    no_show = "no-show"


class MovedFrom(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    date: str
    start_min: StrictInt = Field(alias="startMin", ge=0, le=1439)

    @field_validator("date", mode="before")
    @classmethod
    def date_must_be_iso(cls, value: object) -> str:
        return _require_iso_date(value)


class Lesson(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    date: str
    start_min: StrictInt = Field(alias="startMin", ge=0, le=1439)
    end_min: StrictInt = Field(alias="endMin", ge=1, le=1440)
    class_group_id: str = Field(alias="classGroupId")
    room_id: str = Field(alias="roomId")
    teacher_id: str = Field(alias="teacherId")
    cm_name: str | None = Field(default=None, alias="cmName")
    curriculum: str
    week_code: str | None = Field(default=None, alias="weekCode")
    status: LessonStatus
    moved_from: MovedFrom | None = Field(default=None, alias="movedFrom")

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_null_optionals(cls, data: object) -> object:
        if isinstance(data, dict):
            for key in _OPTIONAL_WIRE_KEYS:
                if key in data and data[key] is None:
                    raise ValueError(f"{key} must be omitted, not null")
        return data

    @field_validator("date", mode="before")
    @classmethod
    def date_must_be_iso(cls, value: object) -> str:
        return _require_iso_date(value)

    @model_validator(mode="after")
    def end_after_start(self) -> Self:
        if self.end_min <= self.start_min:
            raise ValueError("endMin must be greater than startMin")
        return self
