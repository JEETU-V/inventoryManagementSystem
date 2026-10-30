import unittest
from decimal import Decimal

from flask_jwt_extended import create_access_token

from app import create_app
from models import InventoryTransaction, Product, User, db
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class InventoryRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()
        admin = User(
            name="Admin",
            email="admin@example.com",
            password_hash=hash_password("test-password"),
            role="admin",
        )
        staff = User(
            name="Staff",
            email="staff@example.com",
            password_hash=hash_password("test-password"),
            role="staff",
        )
        product = Product(
            name="Notebook",
            sku="NOTEBOOK-1",
            category="Paper",
            purchase_price=Decimal("3.00"),
            quantity=10,
            price=Decimal("5.00"),
            reorder_level=2,
        )
        db.session.add_all([admin, staff, product])
        db.session.commit()
        self.product = product
        self.admin_headers = self.auth_headers(admin)
        self.staff_headers = self.auth_headers(staff)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    @staticmethod
    def auth_headers(user):
        token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        return {"Authorization": f"Bearer {token}"}

    def post_adjustment(self, headers, **overrides):
        payload = {
            "productId": self.product.id,
            "transactionType": "stock_in",
            "quantity": 3,
            "reason": "Delivery",
            **overrides,
        }
        return self.client.post("/api/inventory/transactions", json=payload, headers=headers)

    def test_only_admins_adjust_stock_and_movements_are_recorded(self):
        denied = self.post_adjustment(self.staff_headers)
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(self.product.quantity, 10)
        self.assertEqual(InventoryTransaction.query.count(), 0)

        accepted = self.post_adjustment(self.admin_headers)
        self.assertEqual(accepted.status_code, 201)
        self.assertEqual(accepted.json["quantity"], 13)
        movement = InventoryTransaction.query.one()
        self.assertEqual(movement.transaction_type, "stock_in")
        self.assertEqual(movement.quantity, 3)
        self.assertEqual(movement.reason, "Delivery")

    def test_rejects_invalid_and_overdrawn_adjustments(self):
        invalid = self.post_adjustment(self.admin_headers, quantity=0)
        self.assertEqual(invalid.status_code, 422)

        missing_reason = self.post_adjustment(self.admin_headers, reason="  ")
        self.assertEqual(missing_reason.status_code, 422)

        overdraw = self.post_adjustment(
            self.admin_headers,
            transactionType="stock_out",
            quantity=11,
        )
        self.assertEqual(overdraw.status_code, 409)
        self.assertEqual(self.product.quantity, 10)
        self.assertEqual(InventoryTransaction.query.count(), 0)


if __name__ == "__main__":
    unittest.main()
