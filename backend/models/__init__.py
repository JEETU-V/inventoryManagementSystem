from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .entities import (  # noqa: E402,F401
    Category,
    Customer,
    InventoryTransaction,
    Order,
    OrderItem,
    Product,
    ProfitRecord,
    Sale,
    SaleItem,
    Supplier,
    SupplierPdfItem,
    SupplierPdfUpload,
    SupplierTransaction,
    User,
)
