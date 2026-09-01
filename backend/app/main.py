from fastapi import FastAPI

from app.fixtures import LESSONS, TEACHERS
from app.schemas import Lesson, Teacher

app = FastAPI()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/teachers", response_model=list[Teacher])
def list_teachers() -> list[Teacher]:
    return TEACHERS


@app.get("/lessons", response_model=list[Lesson], response_model_exclude_none=True)
def list_lessons() -> list[Lesson]:
    return LESSONS
