"""
Who is this request from?

Sessions are opaque rows in PostgreSQL. The browser only holds a random token
in an HttpOnly cookie; the database stores HMAC-SHA256(AUTH_SECRET, token).
Role and teacher_id are read from `users` on every request.
"""

import datetime
import hashlib
import hmac
import os
import secrets
from typing import Annotated
from uuid import uuid4
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ForbiddenError, UnauthorizedError
from app.models import SessionModel, UserModel
from app.schemas import AuthTeacher, AuthUser, UserRole

COOKIE_NAME = "classflow_session"
SESSION_TTL = datetime.timedelta(days=14)
_MIN_SECRET_BYTES = 32
_UTC = datetime.timezone.utc

DbSession = Annotated[Session, Depends(get_db, scope="function")]

_hasher = PasswordHasher()
# Verified when the email is unknown or the account is inactive, so those
# cases take about as long as a wrong password for a real account.
_DUMMY_HASH = _hasher.hash("classflow-dummy-password")


def auth_secret() -> bytes:
    """Required at process start. There is no default."""
    raw = os.environ.get("AUTH_SECRET")
    if raw is None or len(raw.encode()) < _MIN_SECRET_BYTES:
        raise RuntimeError("AUTH_SECRET must be set and at least 32 bytes")
    return raw.encode()


def cookie_secure() -> bool:
    """Required. Local HTTP sets false; production sets true."""
    raw = os.environ.get("COOKIE_SECURE")
    if raw == "true":
        return True
    if raw == "false":
        return False
    raise RuntimeError("COOKIE_SECURE must be 'true' or 'false'")


def require_auth_config() -> None:
    auth_secret()
    cookie_secure()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def token_hash(token: str) -> str:
    return hmac.new(auth_secret(), token.encode(), hashlib.sha256).hexdigest()


def _now() -> datetime.datetime:
    return datetime.datetime.now(_UTC)


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=cookie_secure(),
        path="/",
        max_age=int(SESSION_TTL.total_seconds()),
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=cookie_secure(),
    )


def create_session(db: Session, user: UserModel) -> str:
    token = secrets.token_urlsafe(32)
    now = _now()
    db.add(
        SessionModel(
            id=f"ses-{uuid4().hex[:12]}",
            token_hash=token_hash(token),
            user_id=user.id,
            expires_at=now + SESSION_TTL,
            created_at=now,
        )
    )
    db.flush()
    return token


def revoke_token(db: Session, token: str | None) -> None:
    if not token:
        return
    row = db.scalar(select(SessionModel).where(SessionModel.token_hash == token_hash(token)))
    if row is not None:
        db.delete(row)
        db.flush()


def authenticate(db: Session, email: str, password: str) -> UserModel:
    normalized = email.strip().lower()
    user = db.scalar(select(UserModel).where(UserModel.email == normalized))
    if user is None or not user.active:
        verify_password(password, _DUMMY_HASH)
        raise UnauthorizedError("Invalid email or password.", "invalid_credentials")
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError("Invalid email or password.", "invalid_credentials")
    return user


def to_auth_user(db: Session, user: UserModel) -> AuthUser:
    teacher: AuthTeacher | None = None
    if user.role == UserRole.teacher.value:
        row = user.teacher if user.teacher is not None else None
        if row is None and user.teacher_id is not None:
            from app.models import TeacherModel

            row = db.get(TeacherModel, user.teacher_id)
        if row is None:
            raise UnauthorizedError(clear_cookie=True)
        teacher = AuthTeacher(id=row.id, code=row.code, name=row.name)
    return AuthUser(
        id=user.id,
        email=user.email,
        role=UserRole(user.role),
        teacher=teacher,
    )


def get_current_user(request: Request, db: DbSession) -> UserModel:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise UnauthorizedError(clear_cookie=True)
    row = db.scalar(select(SessionModel).where(SessionModel.token_hash == token_hash(token)))
    if row is None or _as_utc(row.expires_at) <= _now():
        raise UnauthorizedError(clear_cookie=True)
    user = db.get(UserModel, row.user_id)
    if user is None or not user.active:
        raise UnauthorizedError(clear_cookie=True)
    return user


def require_user(user: Annotated[UserModel, Depends(get_current_user)]) -> UserModel:
    return user


def require_manager(user: Annotated[UserModel, Depends(get_current_user)]) -> UserModel:
    if user.role != UserRole.manager.value:
        raise ForbiddenError()
    return user


def _as_utc(value: datetime.datetime) -> datetime.datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=_UTC)
    return value.astimezone(_UTC)


CurrentUser = Annotated[UserModel, Depends(get_current_user)]
ManagerUser = Annotated[UserModel, Depends(require_manager)]
