from .auth import auth_bp
from .customers import customers_bp
from .dashboard import dashboard_bp
from .inventory import inventory_bp
from .orders import orders_bp
from .products import products_bp
from .profit import profit_bp
from .sales import sales_bp
from .suppliers import suppliers_bp
from .bills import bills_bp
from .supplier_pdf import supplier_pdf_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(suppliers_bp, url_prefix="/api/suppliers")
    app.register_blueprint(customers_bp, url_prefix="/api/customers")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(profit_bp, url_prefix="/api/profit")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(bills_bp, url_prefix="/api/bills")
    app.register_blueprint(supplier_pdf_bp, url_prefix="/api/supplier-pdf")

