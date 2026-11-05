import unittest
from decimal import Decimal

from flask_jwt_extended import create_access_token

from app import create_app
from models import (
    Business,
    BusinessMembership,
    Customer,
    InventoryTransaction,
    Order,
    Product,
    User,
    db,
)
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class OrderRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()
        admin = User(
            name="Test Admin",
            email="admin@example.com",
            password_hash=hash_password("test-password"),
            role="admin",
        )
        business = Business(name="Test Shop", slug="test-shop", created_by=admin)
        db.session.add_all([admin, business])
        db.session.flush()
        customer = Customer(
            business_id=business.id,
            name="Test Customer",
            phone="555-0100",
            email="customer@example.com",
            address="Test address",
        )
        product = Product(
            business_id=business.id,
            name="Notebook",
            sku="NOTEBOOK-1",
            category="Paper",
            purchase_price=Decimal("3.00"),
            quantity=10,
            price=Decimal("5.00"),
            reorder_level=2,
        )
        db.session.add_all([customer, product])
        db.session.add(BusinessMembership(user=admin, business=business, role="owner"))
        db.session.commit()
        self.customer = customer
        self.product = product
        token = create_access_token(identity=str(admin.id), additional_claims={"role": "admin"})
        self.headers = {"Authorization": f"Bearer {token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    def payload(self, **overrides):
        return {
            "customerId": self.customer.id,
            "items": [{"productId": self.product.id, "quantity": 2, "discount": 0}],
            **overrides,
        }

    def test_creation_rejects_status_and_new_orders_start_pending(self):
        invalid = self.client.post(
            "/api/orders",
            json=self.payload(status="Completed"),
            headers=self.headers,
        )
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(Order.query.count(), 0)
        self.assertEqual(self.product.quantity, 10)

        created = self.client.post("/api/orders", json=self.payload(), headers=self.headers)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json["status"], "Pending")
        self.assertEqual(self.product.quantity, 8)

    def test_creation_requires_an_existing_customer(self):
        response = self.client.post(
            "/api/orders",
            json=self.payload(customerId=self.customer.id + 100),
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.product.quantity, 10)

    def test_completed_and_cancelled_orders_are_terminal(self):
        created = self.client.post("/api/orders", json=self.payload(), headers=self.headers)
        order_id = created.json["id"]
        completed = self.client.put(
            f"/api/orders/{order_id}",
            json={"status": "Completed"},
            headers=self.headers,
        )
        self.assertEqual(completed.status_code, 200)

        invalid_transition = self.client.put(
            f"/api/orders/{order_id}",
            json={"status": "Pending"},
            headers=self.headers,
        )
        self.assertEqual(invalid_transition.status_code, 409)

        cancel_completed = self.client.post(
            f"/api/orders/{order_id}/cancel",
            headers=self.headers,
        )
        self.assertEqual(cancel_completed.status_code, 409)

        another = self.client.post("/api/orders", json=self.payload(), headers=self.headers)
        cancelled = self.client.post(
            f"/api/orders/{another.json['id']}/cancel",
            headers=self.headers,
        )
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.json["status"], "Cancelled")
        self.assertEqual(self.product.quantity, 8)
        self.assertEqual(InventoryTransaction.query.count(), 3)


if __name__ == "__main__":
    unittest.main()
