"""
Create one production login.

Identity comes from arguments. The password is read with getpass and is never
printed, logged, or accepted as a flag.

    python -m app.bootstrap_user --email manager@example.com --role manager
    python -m app.bootstrap_user --email dav@example.com --role teacher --teacher-id t-dav
"""

import argparse
import getpass
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.db import get_session_factory
from app.models import TeacherModel, UserModel

MIN_PASSWORD_LENGTH = 12


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> str:
    normalized = normalize_email(email)
    if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
        raise SystemExit("Email must contain a domain.")
    if normalized.endswith("@localhost"):
        raise SystemExit(
            "Refusing an @localhost email. Those accounts are for local development only."
        )
    return normalized


def validate_role(role: str, teacher_id: str | None) -> None:
    if role == "manager" and teacher_id is not None:
        raise SystemExit("A manager account cannot be linked to a teacher.")
    if role == "teacher" and not teacher_id:
        raise SystemExit("A teacher account requires --teacher-id.")
    if role not in ("manager", "teacher"):
        raise SystemExit("Role must be manager or teacher.")


def validate_password(password: str, email: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise SystemExit(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    if password.casefold() == email.casefold():
        raise SystemExit("Password must not match the email.")


def read_password(email: str) -> str:
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        raise SystemExit("Passwords did not match.")
    validate_password(password, email)
    return password


def bootstrap_user(
    session: Session,
    *,
    email: str,
    role: str,
    teacher_id: str | None,
    password: str,
) -> str:
    """
    Insert a user or leave an existing row unchanged.

    Returns a status line that contains the email and role only.
    """
    normalized = validate_email(email)
    validate_role(role, teacher_id)
    validate_password(password, normalized)
    if role == "teacher":
        teacher = session.get(TeacherModel, teacher_id)
        if teacher is None:
            raise SystemExit(f"Teacher not found: {teacher_id}")
    existing = session.scalar(select(UserModel).where(UserModel.email == normalized))
    if existing is not None:
        return f"User already exists: {normalized}. Password was left unchanged."
    session.add(
        UserModel(
            id=f"usr-{uuid4().hex[:12]}",
            email=normalized,
            password_hash=hash_password(password),
            role=role,
            teacher_id=teacher_id,
            active=True,
        )
    )
    session.flush()
    return f"Created {role} user {normalized}."


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Create one ClassFlow production login.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", required=True, choices=("manager", "teacher"))
    parser.add_argument("--teacher-id", default=None)
    args = parser.parse_args(argv)
    email = validate_email(args.email)
    validate_role(args.role, args.teacher_id)
    password = read_password(email)
    with get_session_factory()() as session:
        message = bootstrap_user(
            session,
            email=email,
            role=args.role,
            teacher_id=args.teacher_id,
            password=password,
        )
        session.commit()
    print(message)
    del password


if __name__ == "__main__":
    main()
