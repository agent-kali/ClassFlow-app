import datetime
from contextlib import asynccontextmanager
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, Request, Response, status
from sqlalchemy.orm import Session

from app import lessons as lesson_service
from app.auth import (
    COOKIE_NAME,
    CurrentUser,
    ManagerUser,
    authenticate,
    clear_session_cookie,
    create_session,
    require_auth_config,
    revoke_token,
    set_session_cookie,
    to_auth_user,
)
from app.catalog import (
    list_campuses,
    list_class_groups,
    list_rooms,
    list_schools,
    list_teachers,
)
from app.db import get_db, get_engine
from app.errors import ForbiddenError, register_error_handlers
from app.models import UserModel
from app.schemas import (
    AuthUser,
    Campus,
    ClassGroup,
    FxRate,
    Lesson,
    LessonCreate,
    LessonPatch,
    LoginBody,
    RescheduleLessonBody,
    Room,
    School,
    SetLessonStatusBody,
    Teacher,
    UserRole,
)

def require_database() -> None:
    """Fail the process before it takes traffic if Postgres cannot be reached."""
    from sqlalchemy import text

    with get_engine().connect() as connection:
        connection.execute(text("SELECT 1"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    require_auth_config()
    require_database()
    yield


app = FastAPI(title="ClassFlow API", lifespan=lifespan)
register_error_handlers(app)


@app.middleware("http")
async def private_no_store(request: Request, call_next):
    """Authenticated responses must not become a shared CDN cache entry."""
    response = await call_next(request)
    response.headers["Cache-Control"] = "private, no-store"
    return response

# Function scope: get_db() commit/rollback must finish before the response is
# sent. Default request-scoped yield teardown would run after the body goes out.
DbSession = Annotated[Session, Depends(get_db, scope="function")]

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


@app.post("/auth/login", response_model=AuthUser, response_model_exclude_none=True)
def login(body: LoginBody, request: Request, response: Response, db: DbSession) -> AuthUser:
    # Authenticate before touching the current cookie. A wrong password must
    # leave the browser's existing session row in place.
    user = authenticate(db, body.email, body.password)
    revoke_token(db, request.cookies.get(COOKIE_NAME))
    set_session_cookie(response, create_session(db, user))
    return to_auth_user(db, user)


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: DbSession) -> Response:
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    revoke_token(db, request.cookies.get(COOKIE_NAME))
    clear_session_cookie(response)
    return response


@app.get("/auth/me", response_model=AuthUser, response_model_exclude_none=True)
def me(user: CurrentUser, db: DbSession) -> AuthUser:
    return to_auth_user(db, user)


@app.get("/schools", response_model=list[School])
def get_schools(user: CurrentUser, db: DbSession):
    return list_schools(db, user)


@app.get("/campuses", response_model=list[Campus])
def get_campuses(user: CurrentUser, db: DbSession):
    return list_campuses(db, user)


@app.get("/rooms", response_model=list[Room])
def get_rooms(user: CurrentUser, db: DbSession):
    return list_rooms(db, user)


@app.get("/class-groups", response_model=list[ClassGroup])
def get_class_groups(user: CurrentUser, db: DbSession):
    return list_class_groups(db, user)


@app.get("/teachers", response_model=list[Teacher])
def get_teachers(user: CurrentUser, db: DbSession):
    return list_teachers(db, user)


@app.get("/fx-rate", response_model=FxRate)
def get_fx_rate(_: CurrentUser) -> FxRate:
    return FxRate(
        vndPerUsd=FX_VND_PER_USD,
        capturedOn=_today().isoformat(),
        source=FX_SOURCE,
    )


def _lesson_scope(user: UserModel) -> str | None:
    """Manager sees every lesson. Teacher sees only the linked teacher id."""
    if user.role == UserRole.manager.value:
        return None
    if user.role == UserRole.teacher.value and user.teacher_id:
        return user.teacher_id
    raise ForbiddenError()


@app.get("/lessons", response_model=list[Lesson], response_model_exclude_none=True)
def list_lessons(user: CurrentUser, db: DbSession) -> list[Lesson]:
    return lesson_service.list_lessons(db, teacher_id=_lesson_scope(user))


@app.post(
    "/lessons",
    response_model=Lesson,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson(payload: LessonCreate, _: ManagerUser, db: DbSession) -> Lesson:
    return lesson_service.create_lesson(db, payload)


@app.post(
    "/lessons/import",
    response_model=list[Lesson],
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
def import_lessons(
    payload: list[LessonCreate], _: ManagerUser, db: DbSession
) -> list[Lesson]:
    return lesson_service.import_lessons(db, payload)


@app.patch(
    "/lessons/{lesson_id}", response_model=Lesson, response_model_exclude_none=True
)
def update_lesson(
    lesson_id: str, patch: LessonPatch, _: ManagerUser, db: DbSession
) -> Lesson:
    return lesson_service.patch_lesson(db, lesson_id, patch)


@app.patch(
    "/lessons/{lesson_id}/status",
    response_model=Lesson,
    response_model_exclude_none=True,
)
def set_lesson_status(
    lesson_id: str, body: SetLessonStatusBody, _: ManagerUser, db: DbSession
) -> Lesson:
    return lesson_service.set_lesson_status(db, lesson_id, body.status.value)


@app.patch(
    "/lessons/{lesson_id}/reschedule",
    response_model=Lesson,
    response_model_exclude_none=True,
)
def reschedule_lesson(
    lesson_id: str, body: RescheduleLessonBody, _: ManagerUser, db: DbSession
) -> Lesson:
    return lesson_service.reschedule_lesson(db, lesson_id, body)


@app.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: str, _: ManagerUser, db: DbSession) -> Response:
    lesson_service.delete_lesson(db, lesson_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
