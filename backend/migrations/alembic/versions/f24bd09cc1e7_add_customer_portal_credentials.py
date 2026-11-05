"""add customer portal credentials

Revision ID: f24bd09cc1e7
Revises: e8a413fa120b
Create Date: 2026-11-05 14:36:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f24bd09cc1e7"
down_revision = "e8a413fa120b"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table(
        "customers",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.add_column(sa.Column("portal_password_hash", sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table(
        "customers",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.drop_column("portal_password_hash")
