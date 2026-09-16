"""create_lessons_table

Revision ID: 7f2a4c6e8b10
Revises: 4e7c9a1b2d08
Create Date: 2026-09-15 22:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7f2a4c6e8b10"
down_revision: Union[str, Sequence[str], None] = "4e7c9a1b2d08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lessons",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_min", sa.Integer(), nullable=False),
        sa.Column("end_min", sa.Integer(), nullable=False),
        sa.Column("class_group_id", sa.String(), nullable=False),
        sa.Column("room_id", sa.String(), nullable=False),
        sa.Column("teacher_id", sa.String(), nullable=False),
        sa.Column("cm_name", sa.String(), nullable=True),
        sa.Column("curriculum", sa.String(), nullable=False),
        sa.Column("week_code", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("moved_from_date", sa.Date(), nullable=True),
        sa.Column("moved_from_start_min", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["class_group_id"],
            ["class_groups.id"],
            name="fk_lessons_class_group_id",
        ),
        sa.ForeignKeyConstraint(
            ["room_id"],
            ["rooms.id"],
            name="fk_lessons_room_id",
        ),
        sa.ForeignKeyConstraint(
            ["teacher_id"],
            ["teachers.id"],
            name="fk_lessons_teacher_id",
        ),
        # Local Asia/Ho_Chi_Minh wall-clock minutes from midnight; endMin 1440 is 24:00.
        sa.CheckConstraint(
            "start_min BETWEEN 0 AND 1439",
            name="ck_lessons_start_min",
        ),
        sa.CheckConstraint(
            "end_min BETWEEN 1 AND 1440",
            name="ck_lessons_end_min",
        ),
        sa.CheckConstraint("end_min > start_min", name="ck_lessons_end_after_start"),
        sa.CheckConstraint(
            "status IN ('scheduled', 'cancelled', 'no-show')",
            name="ck_lessons_status",
        ),
        # movedFrom is a date+time pair on the wire: either both parts or neither.
        sa.CheckConstraint(
            "(moved_from_date IS NULL) = (moved_from_start_min IS NULL)",
            name="ck_lessons_moved_from_pair",
        ),
        sa.CheckConstraint(
            "moved_from_start_min IS NULL OR moved_from_start_min BETWEEN 0 AND 1439",
            name="ck_lessons_moved_from_start_min",
        ),
    )


def downgrade() -> None:
    op.drop_table("lessons")
