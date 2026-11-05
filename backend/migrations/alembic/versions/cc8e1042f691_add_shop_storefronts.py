"""add shop storefronts and shared customer accounts

Revision ID: cc8e1042f691
Revises: b63f2e7a91c4
Create Date: 2026-11-05 15:34:30.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "cc8e1042f691"
down_revision = "b63f2e7a91c4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_customer_accounts_email", "customer_accounts", ["email"])

    with op.batch_alter_table(
        "businesses",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.add_column(sa.Column("storefront_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column("storefront_description", sa.String(length=500), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("storefront_logo_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("storefront_brand_color", sa.String(length=7), nullable=False, server_default="#047857"))
        batch_op.add_column(sa.Column("storefront_contact_email", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("storefront_contact_phone", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("storefront_address", sa.String(length=500), nullable=True))

    with op.batch_alter_table(
        "customers",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.add_column(sa.Column("customer_account_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_customers_customer_account_id",
            "customer_accounts",
            ["customer_account_id"],
            ["id"],
        )
        batch_op.create_index("ix_customers_customer_account_id", ["customer_account_id"])
        batch_op.create_unique_constraint(
            "uq_customers_business_account",
            ["business_id", "customer_account_id"],
        )

    with op.batch_alter_table(
        "orders",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.add_column(sa.Column("fulfillment_type", sa.String(length=20), nullable=False, server_default="pickup"))
        batch_op.add_column(sa.Column("delivery_address", sa.Text(), nullable=False, server_default=""))


def downgrade():
    with op.batch_alter_table(
        "orders",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.drop_column("delivery_address")
        batch_op.drop_column("fulfillment_type")

    with op.batch_alter_table(
        "customers",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.drop_constraint("uq_customers_business_account", type_="unique")
        batch_op.drop_index("ix_customers_customer_account_id")
        batch_op.drop_constraint("fk_customers_customer_account_id", type_="foreignkey")
        batch_op.drop_column("customer_account_id")

    with op.batch_alter_table(
        "businesses",
        recreate="always" if op.get_bind().dialect.name == "sqlite" else "auto",
    ) as batch_op:
        batch_op.drop_column("storefront_brand_color")
        batch_op.drop_column("storefront_address")
        batch_op.drop_column("storefront_contact_phone")
        batch_op.drop_column("storefront_contact_email")
        batch_op.drop_column("storefront_logo_url")
        batch_op.drop_column("storefront_description")
        batch_op.drop_column("storefront_enabled")

    op.drop_index("ix_customer_accounts_email", table_name="customer_accounts")
    op.drop_table("customer_accounts")
