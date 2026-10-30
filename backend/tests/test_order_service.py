import unittest
from decimal import Decimal

from app import create_app
from models import Customer, InventoryTransaction, Product, Sale, db
from services.order_service import create_order, update_order_status
from utils.errors import ApiError


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class OrderStatusFlowTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

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
            price=Decimal("5.00"),
            reorder_level=2,
        )
        db.session.add_all([self.customer, self.product])
        db.session.flush()
        self.order = create_order({
            "customer_id": self.customer.id,
            "items": [{"product_id": self.product.id, "quantity": 2, "discount": 0}],
        })
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    def test_completing_pending_order_records_sale_without_changing_stock(self):
        self.assertEqual(self.product.quantity, 8)
        self.assertEqual(InventoryTransaction.query.count(), 1)

        update_order_status(self.order, "Completed")
        db.session.commit()

        sale = Sale.query.filter_by(order_id=self.order.id).one()
        self.assertEqual(sale.total_quantity, 2)
        self.assertEqual(sale.total_amount, Decimal("10.00"))
        self.assertEqual(len(sale.items), 1)
        self.assertEqual(sale.items[0].product_name, "Notebook")
        self.assertEqual(self.product.quantity, 8)
        self.assertEqual(InventoryTransaction.query.count(), 1)

        update_order_status(self.order, "Completed")
        db.session.commit()
        self.assertEqual(Sale.query.filter_by(order_id=self.order.id).count(), 1)

    def test_completed_order_cannot_return_to_pending(self):
        update_order_status(self.order, "Completed")
        db.session.commit()

        with self.assertRaises(ApiError):
            update_order_status(self.order, "Pending")
        self.assertEqual(Sale.query.filter_by(order_id=self.order.id).count(), 1)
        self.assertEqual(self.product.quantity, 8)

    def test_cancelled_order_cannot_be_reopened(self):
        update_order_status(self.order, "Cancelled")
        db.session.commit()
        self.assertEqual(self.product.quantity, 10)

        with self.assertRaises(ApiError):
            update_order_status(self.order, "Pending")
        self.assertEqual(self.product.quantity, 10)
        self.assertEqual(InventoryTransaction.query.count(), 2)
        self.assertEqual(Sale.query.filter_by(order_id=self.order.id).count(), 0)


if __name__ == "__main__":
    unittest.main()
