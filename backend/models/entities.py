from datetime import date, datetime
from decimal import Decimal

from . import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="staff")
    is_active = db.Column(db.Boolean, nullable=False, default=True)


class Category(db.Model, TimestampMixin):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)

    products = db.relationship("Product", back_populates="category_ref")


class Supplier(db.Model, TimestampMixin):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    contact = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    products_supplied = db.Column(db.Text, nullable=False)

    products = db.relationship("Product", back_populates="supplier")
    transactions = db.relationship("SupplierTransaction", back_populates="supplier")
    pdf_uploads = db.relationship("SupplierPdfUpload", back_populates="supplier", cascade="all, delete-orphan")


class Product(db.Model, TimestampMixin):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    name = db.Column(db.String(160), nullable=False)
    sku = db.Column(db.String(80), unique=True, nullable=False, index=True)
    category = db.Column(db.String(120), nullable=False, default="")
    purchase_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=10)

    supplier = db.relationship("Supplier", back_populates="products")
    category_ref = db.relationship("Category", back_populates="products")
    supplier_transactions = db.relationship("SupplierTransaction", back_populates="product")
    inventory_transactions = db.relationship("InventoryTransaction", back_populates="product")


class SupplierTransaction(db.Model, TimestampMixin):
    __tablename__ = "supplier_transactions"

    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    total_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    date = db.Column(db.Date, nullable=False, default=date.today)

    supplier = db.relationship("Supplier", back_populates="transactions")
    product = db.relationship("Product", back_populates="supplier_transactions")


class Customer(db.Model, TimestampMixin):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    phone = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    address = db.Column(db.Text, nullable=False)

    orders = db.relationship("Order", back_populates="customer")


class Order(db.Model, TimestampMixin):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    total_quantity = db.Column(db.Integer, nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(30), nullable=False, default="Pending")
    date = db.Column(db.Date, nullable=False, default=date.today)

    customer = db.relationship("Customer", back_populates="orders")
    items = db.relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    sale = db.relationship("Sale", back_populates="order", uselist=False)


class OrderItem(db.Model, TimestampMixin):
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


class Sale(db.Model, TimestampMixin):
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


class SaleItem(db.Model, TimestampMixin):
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


class InventoryTransaction(db.Model, TimestampMixin):
    __tablename__ = "inventory_transactions"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    transaction_type = db.Column(db.String(30), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=False, default="")
    date = db.Column(db.Date, nullable=False, default=date.today)

    product = db.relationship("Product", back_populates="inventory_transactions")


class ProfitRecord(db.Model, TimestampMixin):
    __tablename__ = "profit_records"

    id = db.Column(db.Integer, primary_key=True)
    period = db.Column(db.String(40), nullable=False)
    revenue = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    expenses = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    profit = db.Column(db.Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    date = db.Column(db.Date, nullable=False, default=date.today)


class SupplierPdfUpload(db.Model, TimestampMixin):
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


class SupplierPdfItem(db.Model, TimestampMixin):
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

