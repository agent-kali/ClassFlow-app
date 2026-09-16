import datetime
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import lessons as lesson_service
from app.db import get_db
from app.errors import register_error_handlers
from app.models import (
    CampusModel,
    ClassGroupModel,
    RoomModel,
    SchoolModel,
    TeacherModel,
)
from app.schemas import (
    Campus,
    ClassGroup,
    FxRate,
    Lesson,
    LessonCreate,
    LessonPatch,
    RescheduleLessonBody,
    Room,
    School,
    SetLessonStatusBody,
    Teacher,
)

app = FastAPI(title="ClassFlow API")
register_error_handlers(app)

# The agency books and pays in local Vietnamese time.
AGENCY_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")

# One captured bank spot rate. VND is never stored — it is always derived from
# USD via this rate, so the rate itself needs no table.
FX_VND_PER_USD = 26150.0
FX_SOURCE = "Vietcombank spot"


def _today() -> datetime.date:
    return datetime.datetime.now(AGENCY_TIMEZONE).date()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/schools", response_model=list[School])
def list_schools(db: Session = Depends(get_db)) -> list[School]:
    rows = db.scalars(select(SchoolModel).order_by(SchoolModel.id)).all()
    return [
        School(
            id=row.id,
            name=row.name,
            shortName=row.short_name,
            district=row.district,
            color=row.color,
            hasClassManagers=row.has_class_managers,
        )
        for row in rows
    ]


@app.get("/campuses", response_model=list[Campus])
def list_campuses(db: Session = Depends(get_db)) -> list[Campus]:
    rows = db.scalars(select(CampusModel).order_by(CampusModel.id)).all()
    return [
        Campus(id=row.id, schoolId=row.school_id, name=row.name, address=row.address)
        for row in rows
    ]


@app.get("/rooms", response_model=list[Room])
def list_rooms(db: Session = Depends(get_db)) -> list[Room]:
    rows = db.scalars(select(RoomModel).order_by(RoomModel.id)).all()
    return [Room(id=row.id, campusId=row.campus_id, name=row.name) for row in rows]


@app.get("/class-groups", response_model=list[ClassGroup])
def list_class_groups(db: Session = Depends(get_db)) -> list[ClassGroup]:
    rows = db.scalars(select(ClassGroupModel).order_by(ClassGroupModel.id)).all()
    return [
        ClassGroup(
            id=row.id,
            schoolId=row.school_id,
            code=row.code,
            program=row.program,
            level=row.level,
        )
        for row in rows
    ]


@app.get("/teachers", response_model=list[Teacher])
def list_teachers(db: Session = Depends(get_db)) -> list[Teacher]:
    rows = db.scalars(select(TeacherModel).order_by(TeacherModel.code)).all()
    return [
        Teacher(
            id=row.id,
            code=row.code,
            name=row.name,
            category=row.category,
            usdRate=float(row.usd_rate),
        )
        for row in rows
    ]


@app.get("/fx-rate", response_model=FxRate)
def get_fx_rate() -> FxRate:
    return FxRate(
        vndPerUsd=FX_VND_PER_USD,
        capturedOn=_today().isoformat(),
        source=FX_SOURCE,
    )


@app.get("/lessons", response_model=list[Lesson], response_model_exclude_none=True)
def list_lessons(db: Session = Depends(get_db)) -> list[Lesson]:
    return lesson_service.list_lessons(db)


@app.post(
    "/lessons",
    response_model=Lesson,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson(payload: LessonCreate, db: Session = Depends(get_db)) -> Lesson:
    return lesson_service.create_lesson(db, payload)


@app.post(
    "/lessons/import",
    response_model=list[Lesson],
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
def import_lessons(
    payload: list[LessonCreate], db: Session = Depends(get_db)
) -> list[Lesson]:
    return lesson_service.import_lessons(db, payload)


@app.patch(
    "/lessons/{lesson_id}", response_model=Lesson, response_model_exclude_none=True
)
def update_lesson(
    lesson_id: str, patch: LessonPatch, db: Session = Depends(get_db)
) -> Lesson:
    return lesson_service.patch_lesson(db, lesson_id, patch)


@app.patch(
    "/lessons/{lesson_id}/status",
    response_model=Lesson,
    response_model_exclude_none=True,
)
def set_lesson_status(
    lesson_id: str, body: SetLessonStatusBody, db: Session = Depends(get_db)
) -> Lesson:
    return lesson_service.set_lesson_status(db, lesson_id, body.status.value)


@app.patch(
    "/lessons/{lesson_id}/reschedule",
    response_model=Lesson,
    response_model_exclude_none=True,
)
def reschedule_lesson(
    lesson_id: str, body: RescheduleLessonBody, db: Session = Depends(get_db)
) -> Lesson:
    return lesson_service.reschedule_lesson(db, lesson_id, body)


@app.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: str, db: Session = Depends(get_db)) -> Response:
    lesson_service.delete_lesson(db, lesson_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
