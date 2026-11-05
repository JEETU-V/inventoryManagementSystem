"""require customer password change for issued portal access

Revision ID: a6c30921a74d
Revises: f24bd09cc1e7
Create Date: 2026-11-05 14:42:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "a6c30921a74d"
down_revision = "f24bd09cc1e7"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table(
        "customers",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.add_column(
            sa.Column(
                "portal_requires_password_reset",
                sa.Boolean(),
                server_default=sa.false(),
                nullable=False,
            )
        )


def downgrade():
    with op.batch_alter_table(
        "customers",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.drop_column("portal_requires_password_reset")
