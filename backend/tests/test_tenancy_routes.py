import unittest

from app import create_app
from models import Business, BusinessMembership, Product, User, db


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class TenancyRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    def register(self, email="owner@example.com", business_name="Corner Shop"):
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Shop Owner",
                "email": email,
                "password": "secure-password",
                "businessName": business_name,
                "businessType": "retail",
            },
        )
        self.assertEqual(response.status_code, 201, response.json)
        return response.json

    @staticmethod
    def headers(token, business_id=None):
        headers = {"Authorization": f"Bearer {token}"}
        if business_id is not None:
            headers["X-Business-Id"] = str(business_id)
        return headers

    @staticmethod
    def product_payload(sku):
        return {
            "name": "Notebook",
            "sku": sku,
            "category": "Paper",
            "purchasePrice": 3,
            "quantity": 0,
            "price": 5,
            "reorderLevel": 2,
        }

    def test_registration_creates_owner_business_and_exposes_membership(self):
        registration = self.register()
        business = registration["business"]
        access_headers = self.headers(registration["accessToken"])

        businesses = self.client.get("/api/businesses", headers=access_headers)
        self.assertEqual(businesses.status_code, 200)
        self.assertEqual(businesses.json[0]["id"], business["id"])
        self.assertEqual(businesses.json[0]["role"], "owner")

        current_user = self.client.get("/api/auth/me", headers=access_headers)
        self.assertEqual(current_user.status_code, 200)
        self.assertEqual(current_user.json["businesses"][0]["id"], business["id"])

    def test_active_business_selection_scopes_catalogue_and_requires_membership(self):
        registration = self.register()
        token = registration["accessToken"]
        first_business_id = registration["business"]["id"]
        second_business = self.client.post(
            "/api/businesses",
            json={"name": "Wholesale Depot", "businessType": "wholesale"},
            headers=self.headers(token),
        )
        self.assertEqual(second_business.status_code, 201, second_business.json)
        second_business_id = second_business.json["id"]

        missing_context = self.client.get("/api/products", headers=self.headers(token))
        self.assertEqual(missing_context.status_code, 400)

        first_product = self.client.post(
            "/api/products",
            json=self.product_payload("RETAIL-1"),
            headers=self.headers(token, first_business_id),
        )
        second_product = self.client.post(
            "/api/products",
            json=self.product_payload("RETAIL-1"),
            headers=self.headers(token, second_business_id),
        )
        self.assertEqual(first_product.status_code, 201, first_product.json)
        self.assertEqual(second_product.status_code, 201, second_product.json)

        hidden = self.client.get(
            f"/api/products/{second_product.json['id']}",
            headers=self.headers(token, first_business_id),
        )
        self.assertEqual(hidden.status_code, 404)

        customer = self.client.post(
            "/api/customers",
            json={
                "name": "Local Customer",
                "phone": "555-0101",
                "email": "local@example.com",
                "address": "Local address",
            },
            headers=self.headers(token, first_business_id),
        )
        self.assertEqual(customer.status_code, 201, customer.json)
        cross_business_order = self.client.post(
            "/api/orders",
            json={
                "customerId": customer.json["id"],
                "items": [{"productId": second_product.json["id"], "quantity": 1}],
            },
            headers=self.headers(token, first_business_id),
        )
        self.assertEqual(cross_business_order.status_code, 404)
        other_product = Product.query.filter_by(id=second_product.json["id"]).one()
        self.assertEqual(other_product.quantity, 0)

        listed = self.client.get(
            "/api/products",
            headers=self.headers(token, first_business_id),
        )
        self.assertEqual([item["sku"] for item in listed.json], ["RETAIL-1"])

        unauthorized_business = self.register(
            email="another@example.com",
            business_name="Another Shop",
        )
        forbidden = self.client.get(
            "/api/products",
            headers=self.headers(token, unauthorized_business["business"]["id"]),
        )
        self.assertEqual(forbidden.status_code, 404)

    def test_business_membership_role_controls_write_access(self):
        registration = self.register()
        owner_id = registration["user"]["id"]
        business_id = registration["business"]["id"]
        owner = db.session.get(User, owner_id)
        staff = User(
            name="Shop Staff",
            email="staff@example.com",
            password_hash=owner.password_hash,
            role="staff",
        )
        db.session.add(staff)
        db.session.flush()
        db.session.add(
            BusinessMembership(
                user=staff,
                business_id=business_id,
                role="staff",
            )
        )
        db.session.commit()

        token = self.client.post(
            "/api/auth/login",
            json={"email": "staff@example.com", "password": "secure-password"},
        ).json["accessToken"]
        denied = self.client.post(
            "/api/products",
            json=self.product_payload("STAFF-1"),
            headers=self.headers(token, business_id),
        )
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(Product.query.count(), 0)


if __name__ == "__main__":
    unittest.main()
