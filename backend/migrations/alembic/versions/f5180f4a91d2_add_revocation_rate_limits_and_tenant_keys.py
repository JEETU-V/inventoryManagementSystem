"""add token revocation, persistent auth limits, and tenant integrity keys

Revision ID: f5180f4a91d2
Revises: cc8e1042f691
Create Date: 2026-11-05 17:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f5180f4a91d2"
down_revision = "cc8e1042f691"
branch_labels = None
depends_on = None


PARENT_TABLES = {
    "categories": "uq_categories_business_id_id",
    "suppliers": "uq_suppliers_business_id_id",
    "products": "uq_products_business_id_id",
    "customers": "uq_customers_business_id_id",
    "orders": "uq_orders_business_id_id",
    "sales": "uq_sales_business_id_id",
    "supplier_pdf_uploads": "uq_supplier_pdf_uploads_business_id_id",
}

TENANT_FOREIGN_KEYS = {
    "products": [
        ("supplier_id", "suppliers", "fk_products_supplier_business"),
        ("category_id", "categories", "fk_products_category_business"),
    ],
    "supplier_transactions": [
        ("supplier_id", "suppliers", "fk_supplier_transactions_supplier_business"),
        ("product_id", "products", "fk_supplier_transactions_product_business"),
    ],
    "orders": [
        ("customer_id", "customers", "fk_orders_customer_business"),
    ],
    "order_items": [
        ("order_id", "orders", "fk_order_items_order_business"),
        ("product_id", "products", "fk_order_items_product_business"),
        ("supplier_id", "suppliers", "fk_order_items_supplier_business"),
    ],
    "sales": [
        ("order_id", "orders", "fk_sales_order_business"),
        ("customer_id", "customers", "fk_sales_customer_business"),
    ],
    "sale_items": [
        ("sale_id", "sales", "fk_sale_items_sale_business"),
        ("product_id", "products", "fk_sale_items_product_business"),
    ],
    "inventory_transactions": [
        ("product_id", "products", "fk_inventory_transactions_product_business"),
    ],
    "supplier_pdf_uploads": [
        ("supplier_id", "suppliers", "fk_supplier_pdf_uploads_supplier_business"),
    ],
    "supplier_pdf_items": [
        ("pdf_upload_id", "supplier_pdf_uploads", "fk_supplier_pdf_items_upload_business"),
        ("product_id", "products", "fk_supplier_pdf_items_product_business"),
    ],
}

FK_NAMING = {
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
}


def _add_tenant_foreign_keys():
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    for table_name, relationships in TENANT_FOREIGN_KEYS.items():
        if not inspector.has_table(table_name):
            continue
        existing = inspector.get_foreign_keys(table_name)
        replacements = []
        for column_name, parent_table, new_name in relationships:
            foreign_key = next(
                (
                    item for item in existing
                    if item["constrained_columns"] == [column_name]
                    and item["referred_table"] == parent_table
                    and item["referred_columns"] == ["id"]
                ),
                None,
            )
            if foreign_key:
                old_name = foreign_key["name"] or (
                    f"fk_{table_name}_{column_name}_{parent_table}"
                )
                replacements.append((column_name, parent_table, old_name, new_name))

        if not replacements:
            continue

        with op.batch_alter_table(
            table_name,
            recreate="always" if connection.dialect.name == "sqlite" else "auto",
            naming_convention=FK_NAMING,
        ) as batch_op:
            for column_name, parent_table, old_name, _ in replacements:
                batch_op.drop_constraint(old_name, type_="foreignkey")
            for column_name, parent_table, _, new_name in replacements:
                batch_op.create_foreign_key(
                    new_name,
                    parent_table,
                    ["business_id", column_name],
                    ["business_id", "id"],
                )
        inspector = sa.inspect(connection)


def _validate_tenant_references():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    metadata = sa.MetaData()

    for table_name, relationships in TENANT_FOREIGN_KEYS.items():
        if not inspector.has_table(table_name):
            continue
        child = sa.Table(table_name, metadata, autoload_with=connection)
        if "business_id" not in child.c or "id" not in child.c:
            raise RuntimeError(
                f"Cannot enforce tenant references: {table_name} is missing "
                "business_id or id."
            )

        for column_name, parent_name, _ in relationships:
            if not inspector.has_table(parent_name):
                raise RuntimeError(
                    f"Cannot enforce tenant references: {parent_name} does not exist."
                )
            parent = sa.Table(parent_name, metadata, autoload_with=connection)
            if column_name not in child.c:
                raise RuntimeError(
                    f"Cannot enforce tenant references: "
                    f"{table_name}.{column_name} does not exist."
                )

            mismatch = connection.execute(
                sa.select(child.c.id)
                .select_from(
                    child.outerjoin(
                        parent,
                        sa.and_(
                            child.c[column_name] == parent.c.id,
                            child.c.business_id == parent.c.business_id,
                        ),
                    )
                )
                .where(child.c[column_name].is_not(None))
                .where(parent.c.id.is_(None))
                .limit(1)
            ).first()
            if mismatch:
                raise RuntimeError(
                    f"Cannot enforce tenant references: {table_name} contains "
                    f"a {column_name} reference to a different or missing "
                    f"{parent_name} record. Repair the data and retry."
                )


def _remove_tenant_foreign_keys():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    for table_name, relationships in TENANT_FOREIGN_KEYS.items():
        if not inspector.has_table(table_name):
            continue
        existing = inspector.get_foreign_keys(table_name)
        with op.batch_alter_table(
            table_name,
            recreate="always" if connection.dialect.name == "sqlite" else "auto",
            naming_convention=FK_NAMING,
        ) as batch_op:
            for column_name, _, name in relationships:
                foreign_key = next(
                    (
                        item for item in existing
                        if item["constrained_columns"] == ["business_id", column_name]
                    ),
                    None,
                )
                if foreign_key:
                    batch_op.drop_constraint(foreign_key["name"] or name, type_="foreignkey")
                    batch_op.create_foreign_key(
                        f"fk_{table_name}_{column_name}_legacy",
                        foreign_key["referred_table"],
                        [column_name],
                        ["id"],
                    )
        inspector = sa.inspect(connection)


def upgrade():
    _validate_tenant_references()

    op.create_table(
        "revoked_tokens",
        sa.Column("jti", sa.String(length=36), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("jti"),
    )
    op.create_index("ix_revoked_tokens_expires_at", "revoked_tokens", ["expires_at"])
    op.create_table(
        "rate_limit_buckets",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False),
        sa.Column("window_started_at", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index(
        "ix_rate_limit_buckets_window_started_at",
        "rate_limit_buckets",
        ["window_started_at"],
    )

    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if inspector.has_table("supplier_pdf_uploads"):
        columns = {
            column["name"]: column
            for column in inspector.get_columns("supplier_pdf_uploads")
        }
        if "file_path" in columns and not columns["file_path"]["nullable"]:
            with op.batch_alter_table(
                "supplier_pdf_uploads",
                recreate="always" if connection.dialect.name == "sqlite" else "auto",
            ) as batch_op:
                batch_op.alter_column(
                    "file_path",
                    existing_type=sa.String(length=500),
                    nullable=True,
                )

    for table_name, constraint_name in PARENT_TABLES.items():
        if not inspector.has_table(table_name):
            continue
        existing = inspector.get_unique_constraints(table_name)
        if any(tuple(item["column_names"]) == ("business_id", "id") for item in existing):
            continue
        with op.batch_alter_table(
            table_name,
            recreate="always" if connection.dialect.name == "sqlite" else "auto",
        ) as batch_op:
            batch_op.create_unique_constraint(
                constraint_name,
                ["business_id", "id"],
            )
        inspector = sa.inspect(connection)

    _add_tenant_foreign_keys()


def downgrade():
    _remove_tenant_foreign_keys()

    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if inspector.has_table("supplier_pdf_uploads"):
        connection.execute(
            sa.text(
                "UPDATE supplier_pdf_uploads "
                "SET file_path = 'processed-in-memory' WHERE file_path IS NULL"
            )
        )
        with op.batch_alter_table(
            "supplier_pdf_uploads",
            recreate="always" if connection.dialect.name == "sqlite" else "auto",
        ) as batch_op:
            batch_op.alter_column(
                "file_path",
                existing_type=sa.String(length=500),
                nullable=False,
            )

    for table_name, constraint_name in reversed(list(PARENT_TABLES.items())):
        if not inspector.has_table(table_name):
            continue
        existing = inspector.get_unique_constraints(table_name)
        if any(item["name"] == constraint_name for item in existing):
            with op.batch_alter_table(
                table_name,
                recreate="always" if connection.dialect.name == "sqlite" else "auto",
            ) as batch_op:
                batch_op.drop_constraint(constraint_name, type_="unique")
        inspector = sa.inspect(connection)

    op.drop_index("ix_rate_limit_buckets_window_started_at", table_name="rate_limit_buckets")
    op.drop_table("rate_limit_buckets")
    op.drop_index("ix_revoked_tokens_expires_at", table_name="revoked_tokens")
    op.drop_table("revoked_tokens")
