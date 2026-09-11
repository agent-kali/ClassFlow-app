"""create_schedule_hierarchy_tables

Revision ID: 4e7c9a1b2d08
Revises: 93d3b1863d27
Create Date: 2026-09-11 17:16:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "4e7c9a1b2d08"
down_revision: Union[str, Sequence[str], None] = "93d3b1863d27"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "schools",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("short_name", sa.String(), nullable=False),
        sa.Column("district", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=False),
        sa.Column("has_class_managers", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("short_name", name="uq_schools_short_name"),
        sa.CheckConstraint(
            "color IN ('teal', 'amber', 'plum', 'moss')",
            name="ck_schools_color",
        ),
    )
    op.create_table(
        "campuses",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("school_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["school_id"],
            ["schools.id"],
            name="fk_campuses_school_id",
        ),
        sa.UniqueConstraint("school_id", "name", name="uq_campuses_school_id_name"),
    )
    op.create_table(
        "rooms",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("campus_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["campus_id"],
            ["campuses.id"],
            name="fk_rooms_campus_id",
        ),
        sa.UniqueConstraint("campus_id", "name", name="uq_rooms_campus_id_name"),
    )
    op.create_table(
        "class_groups",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("school_id", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("program", sa.String(), nullable=False),
        sa.Column("level", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["school_id"],
            ["schools.id"],
            name="fk_class_groups_school_id",
        ),
        sa.UniqueConstraint("school_id", "code", name="uq_class_groups_school_id_code"),
    )


def downgrade() -> None:
    op.drop_table("class_groups")
    op.drop_table("rooms")
    op.drop_table("campuses")
    op.drop_table("schools")
