from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .entities import (  # noqa: E402,F401
    Business,
    BusinessMembership,
    BusinessScoped,
    Category,
    Customer,
    CustomerAccount,
    InventoryTransaction,
    Order,
    OrderItem,
    PlatformAuditEvent,
    PlatformSupportCase,
    Product,
    ProfitRecord,
    RateLimitBucket,
    RevokedToken,
    Sale,
    SaleItem,
    SubscriptionPlan,
    Supplier,
    SupplierPdfItem,
    SupplierPdfUpload,
    SupplierTransaction,
    User,
)
