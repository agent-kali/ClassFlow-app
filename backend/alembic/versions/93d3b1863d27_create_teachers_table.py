"""create_teachers_table

Revision ID: 93d3b1863d27
Revises:
Create Date: 2026-09-04 21:14:12.457069

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "93d3b1863d27"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teachers",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("usd_rate", sa.Numeric(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_teachers_code"),
        sa.CheckConstraint(
            "category IN ('native', 'non-native', 'esl')",
            name="ck_teachers_category",
        ),
        sa.CheckConstraint("usd_rate >= 0", name="ck_teachers_usd_rate"),
    )


def downgrade() -> None:
    op.drop_table("teachers")
