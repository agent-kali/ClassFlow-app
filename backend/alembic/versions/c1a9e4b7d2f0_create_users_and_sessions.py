"""create_users_and_sessions

Revision ID: c1a9e4b7d2f0
Revises: 7f2a4c6e8b10
Create Date: 2026-09-24 17:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1a9e4b7d2f0"
down_revision: Union[str, Sequence[str], None] = "7f2a4c6e8b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("teacher_id", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("teacher_id", name="uq_users_teacher_id"),
        sa.ForeignKeyConstraint(
            ["teacher_id"],
            ["teachers.id"],
            name="fk_users_teacher_id",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint("email = lower(email)", name="ck_users_email_lowercase"),
        sa.CheckConstraint(
            "role IN ('manager', 'teacher')",
            name="ck_users_role",
        ),
        sa.CheckConstraint(
            "(role = 'teacher' AND teacher_id IS NOT NULL) "
            "OR (role = 'manager' AND teacher_id IS NULL)",
            name="ck_users_role_teacher",
        ),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_sessions_token_hash"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_sessions_user_id",
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    op.drop_table("sessions")
    op.drop_table("users")
