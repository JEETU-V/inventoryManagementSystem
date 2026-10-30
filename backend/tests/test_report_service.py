import unittest
from datetime import date
from decimal import Decimal

from app import create_app
from models import Customer, Product, Supplier, SupplierTransaction, db
from services.order_service import create_order, update_order_status
from services.report_service import dashboard_summary, product_profit_breakdown, profit_summary


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class ProfitReportTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.supplier = Supplier(
            name="Paper Supplier",
            contact="555-0101",
            email="supplier@example.com",
            products_supplied="Paper goods",
        )
        self.customer = Customer(
            name="Test Customer",
            phone="555-0100",
            email="customer@example.com",
            address="Test address",
        )
        self.product = Product(
            name="Notebook",
            sku="NOTEBOOK-1",
            category="Paper",
            purchase_price=Decimal("3.00"),
            quantity=10,
            price=Decimal("6.00"),
            reorder_level=2,
        )
        db.session.add_all([self.supplier, self.customer, self.product])
        db.session.flush()
        db.session.add(
            SupplierTransaction(
                supplier_id=self.supplier.id,
                product_id=self.product.id,
                quantity=10,
                total_cost=Decimal("50.00"),
                date=date.today(),
            )
        )
        self.product.quantity += 10
        self.order = create_order({
            "customer_id": self.customer.id,
            "items": [{"product_id": self.product.id, "quantity": 2, "discount": 0}],
        })
        update_order_status(self.order, "Completed")
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    def test_profit_uses_cost_of_sold_units_not_all_supplier_purchases(self):
        report = product_profit_breakdown()
        self.assertEqual(report["totalPurchaseValue"], 50.0)
        self.assertEqual(report["totalSalesValue"], 12.0)
        self.assertEqual(report["totalCostOfGoodsSoldValue"], 10.0)
        self.assertEqual(report["totalProfitValue"], 2.0)
        self.assertEqual(report["products"][0]["soldQty"], 2)
        self.assertEqual(report["products"][0]["costOfGoodsSoldValue"], 10.0)
        self.assertEqual(self.product.quantity, 18)

        summary = profit_summary()
        self.assertEqual(summary["supplierPurchasesValue"], 50.0)
        self.assertEqual(summary["profitValue"], 2.0)

    def test_dashboard_reports_completed_sales_and_gross_profit(self):
        summary = dashboard_summary()
        self.assertEqual(summary["totalSalesValue"], 12.0)
        self.assertEqual(summary["totalProfitValue"], 2.0)
        self.assertEqual(summary["pendingOrders"], 0)


if __name__ == "__main__":
    unittest.main()
