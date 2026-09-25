import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import verify_password
from app.bootstrap_user import (
    bootstrap_user,
    read_password,
    validate_email,
    validate_password,
    validate_role,
)
from app.models import UserModel
from app.seed import seed_reference_data


PASSWORD = "a-real-password"


def test_localhost_email_is_refused() -> None:
    with pytest.raises(SystemExit, match="@localhost"):
        validate_email("manager@localhost")


def test_short_or_email_matching_password_is_refused() -> None:
    with pytest.raises(SystemExit, match="12"):
        validate_password("short-pass", "manager@example.com")
    with pytest.raises(SystemExit, match="must not match"):
        validate_password("manager@example.com", "manager@example.com")


def test_teacher_requires_a_teacher_id_and_manager_does_not() -> None:
    with pytest.raises(SystemExit, match="teacher-id"):
        validate_role("teacher", None)
    with pytest.raises(SystemExit, match="manager"):
        validate_role("manager", "t-dav")


def test_read_password_never_echoes_and_requires_a_match(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    answers = iter([PASSWORD, PASSWORD])
    monkeypatch.setattr("app.bootstrap_user.getpass.getpass", lambda prompt="": next(answers))
    assert read_password("manager@example.com") == PASSWORD
    captured = capsys.readouterr()
    assert PASSWORD not in captured.out
    assert PASSWORD not in captured.err


def test_create_manager_then_leave_the_existing_password(
    db_session: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    created = bootstrap_user(
        db_session,
        email="Manager@Example.com",
        role="manager",
        teacher_id=None,
        password=PASSWORD,
    )
    db_session.flush()
    print(created)
    stored = db_session.scalar(select(UserModel).where(UserModel.email == "manager@example.com"))
    assert stored is not None
    assert stored.role == "manager"
    assert stored.teacher_id is None
    original_hash = stored.password_hash
    assert verify_password(PASSWORD, original_hash)
    again = bootstrap_user(
        db_session,
        email="manager@example.com",
        role="manager",
        teacher_id=None,
        password="a-different-password",
    )
    print(again)
    db_session.refresh(stored)
    assert stored.password_hash == original_hash
    captured = capsys.readouterr()
    assert PASSWORD not in captured.out
    assert "a-different-password" not in captured.out
    assert "already exists" in again
    assert "Created manager user manager@example.com." == created


def test_create_teacher_linked_to_seeded_teacher(db_session: Session) -> None:
    seed_reference_data(db_session)
    message = bootstrap_user(
        db_session,
        email="dav@example.com",
        role="teacher",
        teacher_id="t-dav",
        password=PASSWORD,
    )
    db_session.flush()
    stored = db_session.scalar(select(UserModel).where(UserModel.email == "dav@example.com"))
    assert stored is not None
    assert stored.teacher_id == "t-dav"
    assert message == "Created teacher user dav@example.com."


def test_unknown_teacher_is_refused(db_session: Session) -> None:
    with pytest.raises(SystemExit, match="Teacher not found"):
        bootstrap_user(
            db_session,
            email="ada@example.com",
            role="teacher",
            teacher_id="t-missing",
            password=PASSWORD,
        )


def test_cli_does_not_accept_a_password_argument() -> None:
    from app.bootstrap_user import main

    with pytest.raises(SystemExit):
        main(["--email", "ada@example.com", "--role", "manager", "--password", PASSWORD])
