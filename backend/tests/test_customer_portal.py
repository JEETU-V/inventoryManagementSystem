import unittest

from app import create_app
from models import Business, BusinessMembership, Customer, Order, OrderItem, Product, User, db
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class CustomerPortalTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.owner = User(
            name="Shop Owner",
            email="owner@example.com",
            password_hash=hash_password("owner-password"),
            role="staff",
        )
        db.session.add(self.owner)
        db.session.flush()
        self.business = Business(
            name="Corner Shop",
            slug="corner-shop",
            business_type="retail",
            created_by=self.owner,
        )
        db.session.add(self.business)
        db.session.flush()
        db.session.add(BusinessMembership(user=self.owner, business=self.business, role="owner"))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    def register_customer(self, email="buyer@example.com", password="buyer-password"):
        return self.client.post(
            "/api/customers/portal/register",
            json={
                "businessSlug": self.business.slug,
                "name": "Buyer",
                "email": email,
                "phone": "555-0100",
                "address": "1 Market Street",
                "password": password,
            },
        )

    @staticmethod
    def portal_headers(token):
        return {"Authorization": f"Bearer {token}"}

    def test_customer_can_register_and_view_only_their_order_history(self):
        registration = self.register_customer()
        self.assertEqual(registration.status_code, 201, registration.json)
        customer = Customer.query.one()

        product = Product(
            business_id=self.business.id,
            name="Notebook",
            sku="NB-1",
            category="Paper",
            purchase_price=2,
            quantity=5,
            price=5,
        )
        own_order = Order(
            business_id=self.business.id,
            order_number="ORDER-1",
            customer=customer,
            total_quantity=1,
            total_price=5,
            status="Pending",
        )
        own_order.items.append(
            OrderItem(
                business_id=self.business.id,
                product=product,
                product_name=product.name,
                quantity=1,
                unit_price=5,
                total_price=5,
            )
        )
        other_customer = Customer(
            business_id=self.business.id,
            name="Other Buyer",
            phone="555-0101",
            email="other@example.com",
            address="2 Market Street",
        )
        other_order = Order(
            business_id=self.business.id,
            order_number="ORDER-2",
            customer=other_customer,
            total_quantity=1,
            total_price=5,
            status="Completed",
        )
        db.session.add_all([product, own_order, other_order])
        db.session.commit()

        dashboard = self.client.get(
            "/api/customers/portal/dashboard",
            headers=self.portal_headers(registration.json["accessToken"]),
        )
        self.assertEqual(dashboard.status_code, 200, dashboard.json)
        self.assertEqual(dashboard.json["customer"]["email"], "buyer@example.com")
        self.assertNotIn("portalPasswordHash", dashboard.json["customer"])
        self.assertEqual(dashboard.json["orderCount"], 1)
        self.assertEqual([order["orderNumber"] for order in dashboard.json["orders"]], ["ORDER-1"])

    def test_portal_login_is_business_scoped_and_rejects_bad_credentials(self):
        self.assertEqual(self.register_customer().status_code, 201)
        login = self.client.post(
            "/api/customers/portal/login",
            json={
                "businessSlug": self.business.slug,
                "email": "BUYER@example.com",
                "password": "buyer-password",
            },
        )
        self.assertEqual(login.status_code, 200, login.json)

        bad_login = self.client.post(
            "/api/customers/portal/login",
            json={
                "businessSlug": "unknown-shop",
                "email": "buyer@example.com",
                "password": "buyer-password",
            },
        )
        self.assertEqual(bad_login.status_code, 401)

        owner_login = self.client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "owner-password"},
        )
        denied = self.client.get(
            "/api/customers/portal/dashboard",
            headers=self.portal_headers(owner_login.json["accessToken"]),
        )
        self.assertEqual(denied.status_code, 403)

    def test_registration_cannot_claim_an_existing_customer_record(self):
        existing = Customer(
            business_id=self.business.id,
            name="Old Name",
            phone="555-0199",
            email="buyer@example.com",
            address="Old address",
        )
        db.session.add(existing)
        db.session.commit()

        registration = self.register_customer()
        self.assertEqual(registration.status_code, 409)
        self.assertEqual(Customer.query.count(), 1)
        self.assertEqual(Customer.query.one().name, "Old Name")

    def test_owner_issued_portal_access_requires_customer_password_change(self):
        customer = Customer(
            business_id=self.business.id,
            name="Existing Buyer",
            phone="555-0123",
            email="existing@example.com",
            address="3 Market Street",
        )
        db.session.add(customer)
        db.session.commit()
        owner_login = self.client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "owner-password"},
        )
        owner_headers = {
            **self.portal_headers(owner_login.json["accessToken"]),
            "X-Business-Id": str(self.business.id),
        }

        activation = self.client.post(
            f"/api/customers/{customer.id}/portal-access",
            headers=owner_headers,
        )
        self.assertEqual(activation.status_code, 201, activation.json)
        self.assertTrue(activation.json["customer"]["hasPortalAccount"])

        login = self.client.post(
            "/api/customers/portal/login",
            json={
                "businessSlug": self.business.slug,
                "email": customer.email,
                "password": activation.json["temporaryPassword"],
            },
        )
        self.assertEqual(login.status_code, 200, login.json)
        portal_headers = self.portal_headers(login.json["accessToken"])
        dashboard = self.client.get("/api/customers/portal/dashboard", headers=portal_headers)
        self.assertTrue(dashboard.json["mustChangePassword"])

        changed = self.client.post(
            "/api/customers/portal/password",
            json={
                "currentPassword": activation.json["temporaryPassword"],
                "newPassword": "new-buyer-password",
            },
            headers=portal_headers,
        )
        self.assertEqual(changed.status_code, 200, changed.json)
        dashboard = self.client.get("/api/customers/portal/dashboard", headers=portal_headers)
        self.assertFalse(dashboard.json["mustChangePassword"])

        old_password_login = self.client.post(
            "/api/customers/portal/login",
            json={
                "businessSlug": self.business.slug,
                "email": customer.email,
                "password": activation.json["temporaryPassword"],
            },
        )
        self.assertEqual(old_password_login.status_code, 401)


if __name__ == "__main__":
    unittest.main()
