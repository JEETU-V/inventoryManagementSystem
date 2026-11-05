from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from . import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BusinessScoped:
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=False, index=True)


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="staff")
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    memberships = db.relationship(
        "BusinessMembership",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    businesses_created = db.relationship(
        "Business",
        back_populates="created_by",
        foreign_keys="Business.created_by_id",
    )


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    jti = db.Column(db.String(36), primary_key=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)


class RateLimitBucket(db.Model):
    __tablename__ = "rate_limit_buckets"

    key = db.Column(db.String(64), primary_key=True)
    request_count = db.Column(db.Integer, nullable=False)
    window_started_at = db.Column(db.Integer, nullable=False, index=True)


class CustomerAccount(db.Model, TimestampMixin):
    __tablename__ = "customer_accounts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    shop_profiles = db.relationship("Customer", back_populates="account")


class Business(db.Model, TimestampMixin):
    __tablename__ = "businesses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    slug = db.Column(db.String(120), unique=True, nullable=False, index=True)
    business_type = db.Column(db.String(30), nullable=False, default="retail")
    status = db.Column(db.String(30), nullable=False, default="active")
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subscription_plan_id = db.Column(db.Integer, db.ForeignKey("subscription_plans.id"), nullable=True)
    storefront_enabled = db.Column(db.Boolean, nullable=False, default=True)
    storefront_description = db.Column(db.String(500), nullable=False, default="")
    storefront_logo_url = db.Column(db.String(500), nullable=True)
    storefront_brand_color = db.Column(db.String(7), nullable=False, default="#047857")
    storefront_contact_email = db.Column(db.String(255), nullable=True)
    storefront_contact_phone = db.Column(db.String(80), nullable=True)
    storefront_address = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "business_type IN ('retail', 'wholesale', 'both')",
            name="ck_businesses_business_type",
        ),
        CheckConstraint(
            "status IN ('active', 'suspended')",
            name="ck_businesses_status",
        ),
    )

    created_by = db.relationship(
        "User",
        back_populates="businesses_created",
        foreign_keys=[created_by_id],
    )
    memberships = db.relationship(
        "BusinessMembership",
        back_populates="business",
        cascade="all, delete-orphan",
    )
    subscription_plan = db.relationship("SubscriptionPlan", back_populates="businesses")


class SubscriptionPlan(db.Model, TimestampMixin):
    __tablename__ = "subscription_plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(500), nullable=False, default="")
    monthly_price = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    annual_price = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    businesses = db.relationship("Business", back_populates="subscription_plan")


class PlatformSupportCase(db.Model, TimestampMixin):
    __tablename__ = "platform_support_cases"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=True, index=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subject = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), nullable=False, default="normal")
    status = db.Column(db.String(20), nullable=False, default="open")

    __table_args__ = (
        CheckConstraint(
            "priority IN ('low', 'normal', 'high', 'urgent')",
            name="ck_platform_support_cases_priority",
        ),
        CheckConstraint(
            "status IN ('open', 'in_progress', 'resolved')",
            name="ck_platform_support_cases_status",
        ),
    )

    business = db.relationship("Business")
    created_by = db.relationship("User")


class PlatformAuditEvent(db.Model):
    __tablename__ = "platform_audit_events"

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    action = db.Column(db.String(80), nullable=False, index=True)
    summary = db.Column(db.String(255), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey("businesses.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    actor = db.relationship("User")
    business = db.relationship("Business")


class BusinessMembership(db.Model, TimestampMixin):
    __tablename__ = "business_memberships"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    business_id = db.Column(
        db.Integer,
        db.ForeignKey("businesses.id"),
        nullable=False,
        index=True,
    )
    role = db.Column(db.String(30), nullable=False, default="staff")
    status = db.Column(db.String(30), nullable=False, default="active")

    __table_args__ = (
        UniqueConstraint("user_id", "business_id", name="uq_membership_user_business"),
        CheckConstraint(
            "role IN ('owner', 'manager', 'staff', 'viewer')",
            name="ck_business_memberships_role",
        ),
        CheckConstraint(
            "status IN ('active', 'invited', 'suspended')",
            name="ck_business_memberships_status",
        ),
    )

    user = db.relationship("User", back_populates="memberships")
    business = db.relationship("Business", back_populates="memberships")


class Category(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_categories_business_name"),
        UniqueConstraint("business_id", "id", name="uq_categories_business_id_id"),
    )

    products = db.relationship(
        "Product",
        back_populates="category_ref",
        foreign_keys="Product.category_id",
    )


class Supplier(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    contact = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    products_supplied = db.Column(db.Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_suppliers_business_id_id"),
    )

    products = db.relationship(
        "Product",
        back_populates="supplier",
        foreign_keys="Product.supplier_id",
    )
    transactions = db.relationship(
        "SupplierTransaction",
        back_populates="supplier",
        foreign_keys="SupplierTransaction.supplier_id",
    )
    pdf_uploads = db.relationship(
        "SupplierPdfUpload",
        back_populates="supplier",
        cascade="all, delete-orphan",
        foreign_keys="SupplierPdfUpload.supplier_id",
    )


class Product(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, nullable=True)
    category_id = db.Column(db.Integer, nullable=True)
    name = db.Column(db.String(160), nullable=False)
    sku = db.Column(db.String(80), nullable=False, index=True)
    category = db.Column(db.String(120), nullable=False, default="")
    purchase_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=10)

    __table_args__ = (
        UniqueConstraint("business_id", "sku", name="uq_products_business_sku"),
        UniqueConstraint("business_id", "id", name="uq_products_business_id_id"),
        ForeignKeyConstraint(
            ["business_id", "supplier_id"],
            ["suppliers.business_id", "suppliers.id"],
            name="fk_products_supplier_business",
        ),
        ForeignKeyConstraint(
            ["business_id", "category_id"],
            ["categories.business_id", "categories.id"],
            name="fk_products_category_business",
        ),
    )

    supplier = db.relationship(
        "Supplier",
        back_populates="products",
        foreign_keys=[supplier_id],
    )
    category_ref = db.relationship(
        "Category",
        back_populates="products",
        foreign_keys=[category_id],
    )
    supplier_transactions = db.relationship(
        "SupplierTransaction",
        back_populates="product",
        foreign_keys="SupplierTransaction.product_id",
    )
    inventory_transactions = db.relationship(
        "InventoryTransaction",
        back_populates="product",
        foreign_keys="InventoryTransaction.product_id",
    )


class SupplierTransaction(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "supplier_transactions"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    total_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    date = db.Column(db.Date, nullable=False, default=date.today)

    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "supplier_id"],
            ["suppliers.business_id", "suppliers.id"],
            name="fk_supplier_transactions_supplier_business",
        ),
        ForeignKeyConstraint(
            ["business_id", "product_id"],
            ["products.business_id", "products.id"],
            name="fk_supplier_transactions_product_business",
        ),
    )

    supplier = db.relationship(
        "Supplier",
        back_populates="transactions",
        foreign_keys=[supplier_id],
    )
    product = db.relationship(
        "Product",
        back_populates="supplier_transactions",
        foreign_keys=[product_id],
    )


class Customer(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    phone = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    address = db.Column(db.Text, nullable=False)
    portal_password_hash = db.Column(db.String(255), nullable=True)
    portal_requires_password_reset = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false(),
    )
    customer_account_id = db.Column(
        db.Integer,
        db.ForeignKey("customer_accounts.id"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("business_id", "customer_account_id", name="uq_customers_business_account"),
        UniqueConstraint("business_id", "id", name="uq_customers_business_id_id"),
    )

    account = db.relationship("CustomerAccount", back_populates="shop_profiles")
    business = db.relationship("Business")
    orders = db.relationship(
        "Order",
        back_populates="customer",
        foreign_keys="Order.customer_id",
    )


class Order(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, nullable=False)
    total_quantity = db.Column(db.Integer, nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(30), nullable=False, default="Pending")
    date = db.Column(db.Date, nullable=False, default=date.today)
    fulfillment_type = db.Column(db.String(20), nullable=False, default="pickup")
    delivery_address = db.Column(db.Text, nullable=False, default="")

    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_orders_business_id_id"),
        ForeignKeyConstraint(
            ["business_id", "customer_id"],
            ["customers.business_id", "customers.id"],
            name="fk_orders_customer_business",
        ),
    )

    customer = db.relationship(
        "Customer",
        back_populates="orders",
        foreign_keys=[customer_id],
    )
    items = db.relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        foreign_keys="OrderItem.order_id",
    )
    sale = db.relationship("Sale", back_populates="order", uselist=False, foreign_keys="Sale.order_id")


class OrderItem(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    product_name = db.Column(db.String(160), nullable=False)
    supplier_id = db.Column(db.Integer, nullable=True)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    quantity = db.Column(db.Integer, nullable=False)
    discount = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "order_id"],
            ["orders.business_id", "orders.id"],
            name="fk_order_items_order_business",
        ),
        ForeignKeyConstraint(
            ["business_id", "product_id"],
            ["products.business_id", "products.id"],
            name="fk_order_items_product_business",
        ),
        ForeignKeyConstraint(
            ["business_id", "supplier_id"],
            ["suppliers.business_id", "suppliers.id"],
            name="fk_order_items_supplier_business",
        ),
    )

    order = db.relationship("Order", back_populates="items", foreign_keys=[order_id])
    product = db.relationship("Product", foreign_keys=[product_id])
    supplier = db.relationship("Supplier", foreign_keys=[supplier_id])


class Sale(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, unique=True, nullable=True)
    customer_id = db.Column(db.Integer, nullable=True)
    total_quantity = db.Column(db.Integer, nullable=False, default=0)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    date = db.Column(db.Date, nullable=False, default=date.today)

    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_sales_business_id_id"),
        ForeignKeyConstraint(
            ["business_id", "order_id"],
            ["orders.business_id", "orders.id"],
            name="fk_sales_order_business",
        ),
        ForeignKeyConstraint(
            ["business_id", "customer_id"],
            ["customers.business_id", "customers.id"],
            name="fk_sales_customer_business",
        ),
    )

    order = db.relationship("Order", back_populates="sale", foreign_keys=[order_id])
    customer = db.relationship("Customer", foreign_keys=[customer_id])
    items = db.relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
        foreign_keys="SaleItem.sale_id",
    )


class SaleItem(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "sale_items"

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    product_name = db.Column(db.String(160), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "sale_id"],
            ["sales.business_id", "sales.id"],
            name="fk_sale_items_sale_business",
        ),
        ForeignKeyConstraint(
            ["business_id", "product_id"],
            ["products.business_id", "products.id"],
            name="fk_sale_items_product_business",
        ),
    )

    sale = db.relationship("Sale", back_populates="items", foreign_keys=[sale_id])
    product = db.relationship("Product", foreign_keys=[product_id])


class InventoryTransaction(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "inventory_transactions"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, nullable=False)
    transaction_type = db.Column(db.String(30), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=False, default="")
    date = db.Column(db.Date, nullable=False, default=date.today)

    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "product_id"],
            ["products.business_id", "products.id"],
            name="fk_inventory_transactions_product_business",
        ),
    )

    product = db.relationship(
        "Product",
        back_populates="inventory_transactions",
        foreign_keys=[product_id],
    )


class ProfitRecord(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "profit_records"

    id = db.Column(db.Integer, primary_key=True)
    period = db.Column(db.String(40), nullable=False)
    revenue = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    expenses = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    profit = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    date = db.Column(db.Date, nullable=False, default=date.today)


class SupplierPdfUpload(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "supplier_pdf_uploads"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="processed")
    total_items = db.Column(db.Integer, nullable=False, default=0)
    successfully_added = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    upload_date = db.Column(db.Date, nullable=False, default=date.today)

    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_supplier_pdf_uploads_business_id_id"),
        ForeignKeyConstraint(
            ["business_id", "supplier_id"],
            ["suppliers.business_id", "suppliers.id"],
            name="fk_supplier_pdf_uploads_supplier_business",
        ),
    )

    supplier = db.relationship(
        "Supplier",
        back_populates="pdf_uploads",
        foreign_keys=[supplier_id],
    )
    items = db.relationship(
        "SupplierPdfItem",
        back_populates="pdf_upload",
        cascade="all, delete-orphan",
        foreign_keys="SupplierPdfItem.pdf_upload_id",
    )


class SupplierPdfItem(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "supplier_pdf_items"

    id = db.Column(db.Integer, primary_key=True)
    pdf_upload_id = db.Column(db.Integer, nullable=False)
    product_name = db.Column(db.String(160), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=True)
    description = db.Column(db.Text, nullable=True)
    added_to_inventory = db.Column(db.Boolean, nullable=False, default=False)
    product_id = db.Column(db.Integer, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "pdf_upload_id"],
            ["supplier_pdf_uploads.business_id", "supplier_pdf_uploads.id"],
            name="fk_supplier_pdf_items_upload_business",
        ),
        ForeignKeyConstraint(
            ["business_id", "product_id"],
            ["products.business_id", "products.id"],
            name="fk_supplier_pdf_items_product_business",
        ),
    )

    pdf_upload = db.relationship(
        "SupplierPdfUpload",
        back_populates="items",
        foreign_keys=[pdf_upload_id],
    )
    product = db.relationship("Product", foreign_keys=[product_id])
