import pytest
from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import TeacherModel, UserModel
from app.schemas import UserRole

EXPECTED_COLUMNS = {
    "id",
    "email",
    "password_hash",
    "role",
    "teacher_id",
    "active",
}


def test_users_table_name() -> None:
    assert UserModel.__tablename__ == "users"


def test_users_columns() -> None:
    assert set(UserModel.__table__.columns.keys()) == EXPECTED_COLUMNS


def test_users_email_is_unique_and_lowercase() -> None:
    uniques = [
        constraint
        for constraint in UserModel.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    ]
    email = next(constraint for constraint in uniques if list(constraint.columns.keys()) == ["email"])
    assert email.name == "uq_users_email"
    checks = {
        constraint.name: " ".join(str(constraint.sqltext).split())
        for constraint in UserModel.__table__.constraints
        if isinstance(constraint, CheckConstraint) and constraint.name
    }
    assert "email = lower(email)" in checks["ck_users_email_lowercase"]
    for role in UserRole:
        assert f"'{role.value}'" in checks["ck_users_role"]
    assert "role = 'teacher'" in checks["ck_users_role_teacher"]
    assert "role = 'manager'" in checks["ck_users_role_teacher"]


def test_mixed_case_email_is_rejected_by_the_database(db_session: Session) -> None:
    db_session.add(
        UserModel(
            id="usr-mixed",
            email="Manager@Localhost",
            password_hash="not-a-real-hash",
            role="manager",
            teacher_id=None,
            active=True,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_manager_cannot_carry_a_teacher_id(db_session: Session) -> None:
    db_session.add(
        TeacherModel(
            id="t-constraint",
            code="ZZ",
            name="Constraint Teacher",
            category="native",
            usd_rate=1,
        )
    )
    db_session.add(
        UserModel(
            id="usr-bad-manager",
            email="bad-manager@localhost",
            password_hash="x",
            role="manager",
            teacher_id="t-constraint",
            active=True,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_teacher_requires_a_teacher_id(db_session: Session) -> None:
    db_session.add(
        UserModel(
            id="usr-bad-teacher",
            email="bad-teacher@localhost",
            password_hash="x",
            role="teacher",
            teacher_id=None,
            active=True,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_one_login_per_teacher(db_session: Session) -> None:
    db_session.add(
        TeacherModel(
            id="t-link",
            code="LK",
            name="Link Teacher",
            category="esl",
            usd_rate=1,
        )
    )
    db_session.add(
        UserModel(
            id="usr-link-1",
            email="link-a@localhost",
            password_hash="x",
            role="teacher",
            teacher_id="t-link",
            active=True,
        )
    )
    db_session.flush()
    db_session.add(
        UserModel(
            id="usr-link-2",
            email="link-b@localhost",
            password_hash="y",
            role="teacher",
            teacher_id="t-link",
            active=True,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_email_is_unique(db_session: Session) -> None:
    db_session.add(
        TeacherModel(
            id="t-link",
            code="LK",
            name="Link Teacher",
            category="esl",
            usd_rate=1,
        )
    )
    db_session.add(
        UserModel(
            id="usr-link-1",
            email="link@localhost",
            password_hash="x",
            role="teacher",
            teacher_id="t-link",
            active=True,
        )
    )
    db_session.flush()
    db_session.add(
        UserModel(
            id="usr-link-2",
            email="link@localhost",
            password_hash="y",
            role="manager",
            teacher_id=None,
            active=True,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()
