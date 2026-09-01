from enum import Enum

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI()


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


TEACHERS: list[Teacher] = [
    Teacher(id="t-dav", code="DAV", name="David Okafor", category=TeacherCategory.native, usdRate=22),
    Teacher(id="t-oli", code="OLI", name="Oliver Grant", category=TeacherCategory.native, usdRate=23.5),
    Teacher(id="t-mir", code="MIR", name="Mira Novak", category=TeacherCategory.non_native, usdRate=17.5),
    Teacher(id="t-leo", code="LEO", name="Leo Martins", category=TeacherCategory.non_native, usdRate=18),
    Teacher(id="t-tam", code="TAM", name="Tamara Reyes", category=TeacherCategory.esl, usdRate=16),
    Teacher(id="t-kat", code="KAT", name="Katya Orlova", category=TeacherCategory.esl, usdRate=15.5),
]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/teachers", response_model=list[Teacher])
def list_teachers() -> list[Teacher]:
    return TEACHERS
