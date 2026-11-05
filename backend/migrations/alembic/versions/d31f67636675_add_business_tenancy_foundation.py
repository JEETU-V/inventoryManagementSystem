"""add business tenancy foundation

Revision ID: d31f67636675
Revises:
Create Date: 2026-11-05 13:41:57.004528
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d31f67636675"
down_revision = None
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


def ensure_business_unique_constraint(table_name, columns, constraint_name, old_columns):
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if not inspector.has_table(table_name):
        return

    unique_constraints = inspector.get_unique_constraints(table_name)
    if any(tuple(item["column_names"]) == tuple(columns) for item in unique_constraints):
        return

    old_constraints = [
        item for item in unique_constraints
        if tuple(item["column_names"]) in old_columns
    ]
    naming_convention = {"uq": "uq_%(table_name)s_%(column_0_name)s"}
    recreate = "always" if connection.dialect.name == "sqlite" else "auto"
    with op.batch_alter_table(
        table_name,
        recreate=recreate,
        naming_convention=naming_convention,
    ) as batch_op:
        for item in old_constraints:
            old_name = item["name"] or f"uq_{table_name}_{item['column_names'][0]}"
            batch_op.drop_constraint(old_name, type_="unique")
        batch_op.create_unique_constraint(constraint_name, columns)


def upgrade():
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("businesses"):
        op.create_table(
            "businesses",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("slug", sa.String(length=120), nullable=False),
            sa.Column("business_type", sa.String(length=30), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False),
            sa.Column("created_by_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.CheckConstraint(
                "business_type IN ('retail', 'wholesale', 'both')",
                name="ck_businesses_business_type",
            ),
            sa.CheckConstraint(
                "status IN ('active', 'suspended')",
                name="ck_businesses_status",
            ),
            sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(op.get_bind())

    if not inspector.has_index("businesses", "ix_businesses_slug"):
        op.create_index("ix_businesses_slug", "businesses", ["slug"], unique=True)

    if not inspector.has_table("business_memberships"):
        op.create_table(
            "business_memberships",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("business_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=30), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.CheckConstraint(
                "role IN ('owner', 'manager', 'staff', 'viewer')",
                name="ck_business_memberships_role",
            ),
            sa.CheckConstraint(
                "status IN ('active', 'invited', 'suspended')",
                name="ck_business_memberships_status",
            ),
            sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "business_id", name="uq_membership_user_business"),
        )
        inspector = sa.inspect(op.get_bind())

    if not inspector.has_index("business_memberships", "ix_business_memberships_business_id"):
        op.create_index(
            "ix_business_memberships_business_id",
            "business_memberships",
            ["business_id"],
        )

    inspector = sa.inspect(op.get_bind())
    for table_name in TENANT_TABLES:
        if not inspector.has_table(table_name):
            continue
        if not any(column["name"] == "business_id" for column in inspector.get_columns(table_name)):
            with op.batch_alter_table(table_name) as batch_op:
                batch_op.add_column(
                    sa.Column(
                        "business_id",
                        sa.Integer(),
                        nullable=True,
                    )
                )
                batch_op.create_foreign_key(
                    f"fk_{table_name}_business_id_businesses",
                    "businesses",
                    ["business_id"],
                    ["id"],
                )
            inspector = sa.inspect(op.get_bind())
        index_name = f"ix_{table_name}_business_id"
        if not inspector.has_index(table_name, index_name):
            op.create_index(index_name, table_name, ["business_id"])
            inspector = sa.inspect(op.get_bind())

    ensure_business_unique_constraint(
        "categories",
        ["business_id", "name"],
        "uq_categories_business_name",
        {("name",)},
    )

    inspector = sa.inspect(op.get_bind())
    old_sku_indexes = [
        item for item in inspector.get_indexes("products")
        if item["unique"] and item["column_names"] == ["sku"]
    ] if inspector.has_table("products") else []
    for item in old_sku_indexes:
        op.drop_index(item["name"], table_name="products")
    if old_sku_indexes and not any(
        item["name"] == "ix_products_sku"
        for item in sa.inspect(op.get_bind()).get_indexes("products")
    ):
        op.create_index("ix_products_sku", "products", ["sku"])
    ensure_business_unique_constraint(
        "products",
        ["business_id", "sku"],
        "uq_products_business_sku",
        {("sku",)},
    )

    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if not inspector.has_table("users"):
        return

    owner = connection.execute(
        sa.text(
            "SELECT id, name FROM users "
            "ORDER BY CASE "
            "WHEN is_active = 1 AND role = 'admin' THEN 0 "
            "WHEN is_active = 1 THEN 1 "
            "WHEN role = 'admin' THEN 2 ELSE 3 END, id LIMIT 1"
        )
    ).first()
    if owner is None:
        has_legacy_data = any(
            inspector.has_table(table_name)
            and connection.execute(sa.text(f'SELECT 1 FROM "{table_name}" LIMIT 1')).first()
            for table_name in TENANT_TABLES
        )
        if has_legacy_data:
            raise RuntimeError(
                "Cannot assign legacy business data: create an active user before upgrading."
            )
        return

    business = connection.execute(
        sa.text("SELECT id FROM businesses ORDER BY id LIMIT 1")
    ).first()
    if business is None:
        business_id = connection.execute(
            sa.text(
                "INSERT INTO businesses "
                "(name, slug, business_type, status, created_by_id, created_at, updated_at) "
                "VALUES (:name, :slug, 'retail', 'active', :owner_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "name": f"{owner.name}'s Business",
                "slug": f"legacy-business-{owner.id}",
                "owner_id": owner.id,
            },
        ).lastrowid
    else:
        business_id = business.id

    users = connection.execute(
        sa.text("SELECT id, role, is_active FROM users ORDER BY id")
    ).all()
    for user in users:
        membership_exists = connection.execute(
            sa.text(
                "SELECT 1 FROM business_memberships "
                "WHERE user_id = :user_id AND business_id = :business_id"
            ),
            {"user_id": user.id, "business_id": business_id},
        ).first()
        if membership_exists is not None:
            continue
        membership_role = (
            "owner" if user.id == owner.id
            else "manager" if user.role == "admin"
            else "viewer" if user.role == "viewer"
            else "staff"
        )
        connection.execute(
            sa.text(
                "INSERT INTO business_memberships "
                "(user_id, business_id, role, status, created_at, updated_at) "
                "VALUES (:user_id, :business_id, :role, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "user_id": user.id,
                "business_id": business_id,
                "role": membership_role,
                "status": "active" if user.is_active else "suspended",
            },
        )

    for table_name in TENANT_TABLES:
        if inspector.has_table(table_name):
            connection.execute(
                sa.text(f'UPDATE "{table_name}" SET business_id = :business_id WHERE business_id IS NULL'),
                {"business_id": business_id},
            )


def downgrade():
    raise RuntimeError(
        "Business tenancy stores ownership and membership data; export and "
        "reconcile it manually before removing this migration."
    )
