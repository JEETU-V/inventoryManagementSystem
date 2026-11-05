import unittest
from decimal import Decimal

from flask_jwt_extended import create_access_token

from app import create_app
from models import Business, BusinessMembership, InventoryTransaction, Product, User, db
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class ProductRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.admin = User(
            name="Test Admin",
            email="admin@example.com",
            password_hash=hash_password("test-password"),
            role="admin",
        )
        business = Business(
            name="Test Shop",
            slug="test-shop",
            created_by=self.admin,
        )
        self.admin.memberships.append(
            BusinessMembership(business=business, role="owner")
        )
        db.session.add_all([self.admin, business])
        db.session.commit()
        token = create_access_token(
            identity=str(self.admin.id),
            additional_claims={"role": "admin"},
        )
        self.headers = {"Authorization": f"Bearer {token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    def product_payload(self, **overrides):
        return {
            "name": "  Notebook  ",
            "sku": "  NOTE-1  ",
            "category": "  Paper  ",
            "purchasePrice": 3.25,
            "quantity": 10,
            "price": 5.50,
            "reorderLevel": 2,
            **overrides,
        }

    def test_create_trims_text_and_rejects_duplicate_sku(self):
        response = self.client.post(
            "/api/products",
            json=self.product_payload(),
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["name"], "Notebook")
        self.assertEqual(response.json["sku"], "NOTE-1")
        self.assertEqual(response.json["category"], "Paper")
        self.assertEqual(response.json["quantity"], 10)
        opening = InventoryTransaction.query.filter_by(product_id=response.json["id"]).one()
        self.assertEqual(opening.transaction_type, "stock_in")
        self.assertEqual(opening.quantity, 10)

        duplicate = self.client.post(
            "/api/products",
            json=self.product_payload(name="Another notebook", sku="note-1"),
            headers=self.headers,
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertIn("unique", duplicate.json["details"]["sku"][0].lower())

    def test_create_rejects_invalid_product_values(self):
        response = self.client.post(
            "/api/products",
            json=self.product_payload(name="  ", price=-1, quantity=-2),
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("name", response.json["details"])
        self.assertIn("price", response.json["details"])
        self.assertIn("quantity", response.json["details"])

        excess_precision = self.client.post(
            "/api/products",
            json=self.product_payload(sku="NOTE-2", price=3.123),
            headers=self.headers,
        )
        self.assertEqual(excess_precision.status_code, 422)

    def test_update_saves_product_details_and_requires_inventory_for_stock_changes(self):
        created = self.client.post(
            "/api/products",
            json=self.product_payload(),
            headers=self.headers,
        )
        product_id = created.json["id"]

        updated = self.client.put(
            f"/api/products/{product_id}",
            json={"name": "  Updated notebook  ", "price": 6.75},
            headers=self.headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json["name"], "Updated notebook")
        self.assertEqual(updated.json["priceValue"], 6.75)

        stock_change = self.client.put(
            f"/api/products/{product_id}",
            json={"quantity": 12},
            headers=self.headers,
        )
        self.assertEqual(stock_change.status_code, 422)
        self.assertIn("Inventory", stock_change.json["message"])

    def test_delete_removes_unreferenced_product_and_preserves_history(self):
        removable = Product(
            name="Eraser",
            sku="ERASER-1",
            category="Writing",
            purchase_price=Decimal("1.00"),
            quantity=5,
            price=Decimal("2.00"),
            reorder_level=1,
            business_id=self.admin.memberships[0].business_id,
        )
        referenced = Product(
            name="Pencil",
            sku="PENCIL-1",
            category="Writing",
            purchase_price=Decimal("1.00"),
            quantity=5,
            price=Decimal("2.00"),
            reorder_level=1,
            business_id=self.admin.memberships[0].business_id,
        )
        db.session.add_all([removable, referenced])
        db.session.flush()
        db.session.add(
            InventoryTransaction(
                product_id=referenced.id,
                transaction_type="stock_in",
                quantity=5,
                reason="Test purchase",
                business_id=self.admin.memberships[0].business_id,
            )
        )
        db.session.commit()

        removed = self.client.delete(
            f"/api/products/{removable.id}",
            headers=self.headers,
        )
        self.assertEqual(removed.status_code, 200)

        protected = self.client.delete(
            f"/api/products/{referenced.id}",
            headers=self.headers,
        )
        self.assertEqual(protected.status_code, 409)
        self.assertIn("inventory", protected.json["message"])
        self.assertIsNotNone(db.session.get(Product, referenced.id))

    def test_product_data_is_isolated_between_businesses(self):
        other_business = Business(
            name="Other Shop",
            slug="other-shop",
            created_by=self.admin,
        )
        db.session.add(other_business)
        db.session.flush()
        self.admin.memberships.append(
            BusinessMembership(business=other_business, role="owner")
        )
        other_business_product = Product(
            business_id=other_business.id,
            name="Other notebook",
            sku="OTHER-NOTE-1",
            category="Paper",
            purchase_price=Decimal("3.00"),
            quantity=7,
            price=Decimal("5.00"),
            reorder_level=2,
        )
        db.session.add(other_business_product)
        db.session.commit()
        own_business_id = next(
            membership.business_id
            for membership in self.admin.memberships
            if membership.business_id != other_business.id
        )
        own_headers = {**self.headers, "X-Business-Id": str(own_business_id)}

        hidden = self.client.get(
            f"/api/products/{other_business_product.id}",
            headers=own_headers,
        )
        self.assertEqual(hidden.status_code, 404)

        own_products = self.client.get("/api/products", headers=own_headers)
        self.assertEqual(
            [item["sku"] for item in own_products.json],
            [],
        )

        other_headers = {
            **self.headers,
            "X-Business-Id": str(other_business.id),
        }
        visible = self.client.get(
            f"/api/products/{other_business_product.id}",
            headers=other_headers,
        )
        self.assertEqual(visible.status_code, 200)
        self.assertEqual(visible.json["sku"], "OTHER-NOTE-1")


if __name__ == "__main__":
    unittest.main()
