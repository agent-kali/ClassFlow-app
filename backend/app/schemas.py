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


class SchoolColor(str, Enum):
    teal = "teal"
    amber = "amber"
    plum = "plum"
    moss = "moss"


class Teacher(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    code: str
    name: str
    category: TeacherCategory
    usd_rate: float = Field(alias="usdRate")


class School(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    name: str
    short_name: str = Field(alias="shortName")
    district: str
    color: SchoolColor
    has_class_managers: bool = Field(alias="hasClassManagers")


class Campus(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    school_id: str = Field(alias="schoolId")
    name: str
    address: str


class Room(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    campus_id: str = Field(alias="campusId")
    name: str


class ClassGroup(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    school_id: str = Field(alias="schoolId")
    code: str
    program: str
    level: str


class FxRate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    vnd_per_usd: float = Field(alias="vndPerUsd")
    captured_on: str = Field(alias="capturedOn")
    source: str

    @field_validator("captured_on", mode="before")
    @classmethod
    def captured_on_must_be_iso(cls, value: object) -> str:
        return _require_iso_date(value)


class UserRole(str, Enum):
    manager = "manager"
    teacher = "teacher"


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


class _LessonFields(BaseModel):
    """Every `Lesson` field except `id` — the shape `LessonInput` describes."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

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


class Lesson(_LessonFields):
    id: str


class LessonCreate(_LessonFields):
    """Request body for `createLesson` and each element of `importLessons`."""


class LessonPatch(BaseModel):
    """
    `Partial<LessonInput>`: same fields, all optional. An empty object is a
    no-op patch. `endMin > startMin` is checked against the merged row in
    `app.lessons`, since a patch may carry only one side of the pair.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    date: str | None = None
    start_min: StrictInt | None = Field(default=None, alias="startMin", ge=0, le=1439)
    end_min: StrictInt | None = Field(default=None, alias="endMin", ge=1, le=1440)
    class_group_id: str | None = Field(default=None, alias="classGroupId")
    room_id: str | None = Field(default=None, alias="roomId")
    teacher_id: str | None = Field(default=None, alias="teacherId")
    cm_name: str | None = Field(default=None, alias="cmName")
    curriculum: str | None = None
    week_code: str | None = Field(default=None, alias="weekCode")
    status: LessonStatus | None = None
    moved_from: MovedFrom | None = Field(default=None, alias="movedFrom")

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_nulls(cls, data: object) -> object:
        """No patch field accepts null: omit it to leave the value alone."""
        if isinstance(data, dict):
            for key, value in data.items():
                if value is None:
                    raise ValueError(f"{key} must be omitted, not null")
        return data

    @field_validator("date", mode="before")
    @classmethod
    def date_must_be_iso(cls, value: object) -> str:
        return _require_iso_date(value)


class SetLessonStatusBody(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    status: LessonStatus


class AuthTeacher(BaseModel):
    """The teacher identity a login is allowed to see. No pay rate."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    code: str
    name: str


class AuthUser(BaseModel):
    """Safe session identity. Never includes a password hash or session token."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str
    email: str
    role: UserRole
    teacher: AuthTeacher | None = None


class LoginBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=1)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def email_is_lowercase(cls, value: str) -> str:
        return value.strip().lower()


class RescheduleLessonBody(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    date: str
    start_min: StrictInt = Field(alias="startMin", ge=0, le=1439)
    end_min: StrictInt = Field(alias="endMin", ge=1, le=1440)

    @field_validator("date", mode="before")
    @classmethod
    def date_must_be_iso(cls, value: object) -> str:
        return _require_iso_date(value)

    @model_validator(mode="after")
    def end_after_start(self) -> Self:
        if self.end_min <= self.start_min:
            raise ValueError("endMin must be greater than startMin")
        return self
