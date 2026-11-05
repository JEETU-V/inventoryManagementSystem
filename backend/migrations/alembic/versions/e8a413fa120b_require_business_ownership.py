"""require business ownership for tenant data

Revision ID: e8a413fa120b
Revises: d31f67636675
Create Date: 2026-11-05 14:32:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "e8a413fa120b"
down_revision = "d31f67636675"
branch_labels = None
depends_on = None


TENANT_TABLES = (
    "categories",
    "suppliers",
    "products",
    "supplier_transactions",
    "customers",
    "orders",
    "order_items",
    "sales",
    "sale_items",
    "inventory_transactions",
    "profit_records",
    "supplier_pdf_uploads",
    "supplier_pdf_items",
)


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    quote = connection.dialect.identifier_preparer.quote

    for table_name in TENANT_TABLES:
        if not inspector.has_table(table_name):
            continue
        columns = {column["name"]: column for column in inspector.get_columns(table_name)}
        if "business_id" not in columns:
            raise RuntimeError(
                f"Cannot enforce business ownership: {table_name}.business_id is missing."
            )
        if connection.execute(
            sa.text(
                f"SELECT 1 FROM {quote(table_name)} "
                "WHERE business_id IS NULL LIMIT 1"
            )
        ).first():
            raise RuntimeError(
                f"Cannot enforce business ownership: {table_name} contains unassigned rows."
            )
        if not columns["business_id"]["nullable"]:
            continue

        with op.batch_alter_table(
            table_name,
            recreate="always" if connection.dialect.name == "sqlite" else "auto",
        ) as batch_op:
            batch_op.alter_column(
                "business_id",
                existing_type=sa.Integer(),
                nullable=False,
            )
        inspector = sa.inspect(connection)


def downgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    for table_name in TENANT_TABLES:
        if not inspector.has_table(table_name):
            continue
        columns = {column["name"]: column for column in inspector.get_columns(table_name)}
        if "business_id" not in columns or columns["business_id"]["nullable"]:
            continue

        with op.batch_alter_table(
            table_name,
            recreate="always" if connection.dialect.name == "sqlite" else "auto",
        ) as batch_op:
            batch_op.alter_column(
                "business_id",
                existing_type=sa.Integer(),
                nullable=True,
            )
        inspector = sa.inspect(connection)
