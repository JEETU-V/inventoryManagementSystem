from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, UniqueConstraint

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
    )

    products = db.relationship("Product", back_populates="category_ref")


class Supplier(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    contact = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    products_supplied = db.Column(db.Text, nullable=False)

    products = db.relationship("Product", back_populates="supplier")
    transactions = db.relationship("SupplierTransaction", back_populates="supplier")
    pdf_uploads = db.relationship("SupplierPdfUpload", back_populates="supplier", cascade="all, delete-orphan")


class Product(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    name = db.Column(db.String(160), nullable=False)
    sku = db.Column(db.String(80), nullable=False, index=True)
    category = db.Column(db.String(120), nullable=False, default="")
    purchase_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=10)

    __table_args__ = (
        UniqueConstraint("business_id", "sku", name="uq_products_business_sku"),
    )

    supplier = db.relationship("Supplier", back_populates="products")
    category_ref = db.relationship("Category", back_populates="products")
    supplier_transactions = db.relationship("SupplierTransaction", back_populates="product")
    inventory_transactions = db.relationship("InventoryTransaction", back_populates="product")


class SupplierTransaction(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "supplier_transactions"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    total_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    date = db.Column(db.Date, nullable=False, default=date.today)

    supplier = db.relationship("Supplier", back_populates="transactions")
    product = db.relationship("Product", back_populates="supplier_transactions")


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
    )

    account = db.relationship("CustomerAccount", back_populates="shop_profiles")
    business = db.relationship("Business")
    orders = db.relationship("Order", back_populates="customer")


class Order(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    total_quantity = db.Column(db.Integer, nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(30), nullable=False, default="Pending")
    date = db.Column(db.Date, nullable=False, default=date.today)
    fulfillment_type = db.Column(db.String(20), nullable=False, default="pickup")
    delivery_address = db.Column(db.Text, nullable=False, default="")

    customer = db.relationship("Customer", back_populates="orders")
    items = db.relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    sale = db.relationship("Sale", back_populates="order", uselist=False)


class OrderItem(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    product_name = db.Column(db.String(160), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    quantity = db.Column(db.Integer, nullable=False)
    discount = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product")
    supplier = db.relationship("Supplier")


class Sale(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), unique=True, nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=True)
    total_quantity = db.Column(db.Integer, nullable=False, default=0)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    date = db.Column(db.Date, nullable=False, default=date.today)

    order = db.relationship("Order", back_populates="sale")
    customer = db.relationship("Customer")
    items = db.relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "sale_items"

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    product_name = db.Column(db.String(160), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    sale = db.relationship("Sale", back_populates="items")
    product = db.relationship("Product")


class InventoryTransaction(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "inventory_transactions"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    transaction_type = db.Column(db.String(30), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=False, default="")
    date = db.Column(db.Date, nullable=False, default=date.today)

    product = db.relationship("Product", back_populates="inventory_transactions")


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
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="processed")
    total_items = db.Column(db.Integer, nullable=False, default=0)
    successfully_added = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    upload_date = db.Column(db.Date, nullable=False, default=date.today)

    supplier = db.relationship("Supplier", back_populates="pdf_uploads")
    items = db.relationship("SupplierPdfItem", back_populates="pdf_upload", cascade="all, delete-orphan")


class SupplierPdfItem(db.Model, TimestampMixin, BusinessScoped):
    __tablename__ = "supplier_pdf_items"

    id = db.Column(db.Integer, primary_key=True)
    pdf_upload_id = db.Column(db.Integer, db.ForeignKey("supplier_pdf_uploads.id"), nullable=False)
    product_name = db.Column(db.String(160), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=True)
    description = db.Column(db.Text, nullable=True)
    added_to_inventory = db.Column(db.Boolean, nullable=False, default=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)

    pdf_upload = db.relationship("SupplierPdfUpload", back_populates="items")
    product = db.relationship("Product")
