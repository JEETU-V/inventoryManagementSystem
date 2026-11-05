"""add privacy-restricted platform administration

Revision ID: b63f2e7a91c4
Revises: a6c30921a74d
Create Date: 2026-11-05 15:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "b63f2e7a91c4"
down_revision = "a6c30921a74d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("monthly_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("annual_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    with op.batch_alter_table(
        "businesses",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.add_column(sa.Column("subscription_plan_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_businesses_subscription_plan_id",
            "subscription_plans",
            ["subscription_plan_id"],
            ["id"],
        )

    op.create_table(
        "platform_support_cases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "priority IN ('low', 'normal', 'high', 'urgent')",
            name="ck_platform_support_cases_priority",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'in_progress', 'resolved')",
            name="ck_platform_support_cases_status",
        ),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_platform_support_cases_business_id",
        "platform_support_cases",
        ["business_id"],
    )

    op.create_table(
        "platform_audit_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("summary", sa.String(length=255), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_platform_audit_events_actor_id", "platform_audit_events", ["actor_id"])
    op.create_index("ix_platform_audit_events_action", "platform_audit_events", ["action"])
    op.create_index("ix_platform_audit_events_business_id", "platform_audit_events", ["business_id"])
    op.create_index("ix_platform_audit_events_created_at", "platform_audit_events", ["created_at"])


def downgrade():
    op.drop_index("ix_platform_audit_events_created_at", table_name="platform_audit_events")
    op.drop_index("ix_platform_audit_events_business_id", table_name="platform_audit_events")
    op.drop_index("ix_platform_audit_events_action", table_name="platform_audit_events")
    op.drop_index("ix_platform_audit_events_actor_id", table_name="platform_audit_events")
    op.drop_table("platform_audit_events")
    op.drop_index("ix_platform_support_cases_business_id", table_name="platform_support_cases")
    op.drop_table("platform_support_cases")
    with op.batch_alter_table(
        "businesses",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.drop_constraint("fk_businesses_subscription_plan_id", type_="foreignkey")
        batch_op.drop_column("subscription_plan_id")
    op.drop_table("subscription_plans")
