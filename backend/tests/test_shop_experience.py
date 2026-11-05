import unittest

from app import create_app
from models import Business, BusinessMembership, Customer, CustomerAccount, Product, User, db
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class ShopExperienceTests(unittest.TestCase):
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
        self.other_owner = User(
            name="Other Owner",
            email="other@example.com",
            password_hash=hash_password("other-password"),
            role="staff",
        )
        db.session.add_all([self.owner, self.other_owner])
        db.session.flush()
        self.shop = Business(
            name="Corner Shop",
            slug="corner-shop",
            business_type="retail",
            created_by=self.owner,
        )
        self.other_shop = Business(
            name="Other Shop",
            slug="other-shop",
            business_type="retail",
            created_by=self.other_owner,
        )
        db.session.add_all([self.shop, self.other_shop])
        db.session.flush()
        db.session.add_all([
            BusinessMembership(user=self.owner, business=self.shop, role="owner"),
            BusinessMembership(user=self.other_owner, business=self.other_shop, role="owner"),
            Product(
                business_id=self.shop.id,
                name="Notebook",
                sku="NOTE-1",
                category="Paper",
                purchase_price=2,
                quantity=5,
                price=5,
            ),
            Product(
                business_id=self.other_shop.id,
                name="Camera",
                sku="CAM-1",
                category="Electronics",
                purchase_price=50,
                quantity=2,
                price=100,
            ),
        ])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    @staticmethod
    def headers(token, business_id=None):
        headers = {"Authorization": f"Bearer {token}"}
        if business_id is not None:
            headers["X-Business-Id"] = str(business_id)
        return headers

    def register_customer(self, slug, email="buyer@example.com", password="buyer-password", name="Buyer"):
        return self.client.post(
            f"/api/shops/{slug}/customer/register",
            json={
                "name": name,
                "email": email,
                "password": password,
                "phone": "555-0100",
                "address": f"{slug} Main Street",
            },
        )

    def test_public_shop_catalog_is_slug_scoped_and_excludes_internal_inventory_fields(self):
        shop = self.client.get("/api/shops/corner-shop")
        self.assertEqual(shop.status_code, 200, shop.json)
        self.assertEqual(shop.json["name"], "Corner Shop")
        self.assertTrue(shop.json["brandColor"])

        products = self.client.get("/api/shops/corner-shop/products")
        self.assertEqual(products.status_code, 200, products.json)
        self.assertEqual([product["name"] for product in products.json], ["Notebook"])
        self.assertNotIn("quantity", products.json[0])
        self.assertNotIn("purchasePrice", products.json[0])
        self.assertNotIn("supplierId", products.json[0])

    def test_customer_identity_is_shared_but_profiles_and_order_history_are_shop_scoped(self):
        first_registration = self.register_customer("corner-shop")
        self.assertEqual(first_registration.status_code, 201, first_registration.json)
        account_id = CustomerAccount.query.one().id
        first_customer = Customer.query.filter_by(business_id=self.shop.id).one()

        second_registration = self.register_customer(
            "other-shop",
            name="Buyer at Other Shop",
        )
        self.assertEqual(second_registration.status_code, 201, second_registration.json)
        self.assertEqual(CustomerAccount.query.count(), 1)
        second_customer = Customer.query.filter_by(business_id=self.other_shop.id).one()
        self.assertEqual(first_customer.customer_account_id, account_id)
        self.assertEqual(second_customer.customer_account_id, account_id)
        self.assertNotEqual(first_customer.address, second_customer.address)

        owner_login = self.client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "owner-password"},
        )
        product = Product.query.filter_by(business_id=self.shop.id).one()
        order = self.client.post(
            "/api/shops/corner-shop/customer/orders",
            json={
                "items": [{"productId": product.id, "quantity": 2}],
                "fulfillmentType": "delivery",
                "deliveryAddress": "5 Delivery Road",
            },
            headers=self.headers(first_registration.json["accessToken"]),
        )
        self.assertEqual(order.status_code, 201, order.json)
        self.assertEqual(order.json["fulfillmentType"], "delivery")
        self.assertEqual(order.json["deliveryAddress"], "5 Delivery Road")

        first_orders = self.client.get(
            "/api/shops/corner-shop/customer/orders",
            headers=self.headers(first_registration.json["accessToken"]),
        )
        second_orders = self.client.get(
            "/api/shops/other-shop/customer/orders",
            headers=self.headers(second_registration.json["accessToken"]),
        )
        self.assertEqual(len(first_orders.json), 1)
        self.assertEqual(second_orders.json, [])

        foreign_invoice = self.client.get(
            f"/api/shops/other-shop/customer/orders/{order.json['id']}",
            headers=self.headers(second_registration.json["accessToken"]),
        )
        self.assertEqual(foreign_invoice.status_code, 404)

        owner_customers = self.client.get(
            "/api/customers",
            headers=self.headers(owner_login.json["accessToken"], self.shop.id),
        )
        self.assertEqual(owner_customers.status_code, 200, owner_customers.json)
        self.assertEqual([item["name"] for item in owner_customers.json], ["Buyer"])

    def test_existing_customer_portal_password_migrates_to_shared_account(self):
        legacy_customer = Customer(
            business_id=self.shop.id,
            name="Existing Customer",
            phone="555-0123",
            email="legacy@example.com",
            address="Old Shop Address",
            portal_password_hash=hash_password("legacy-password"),
            portal_requires_password_reset=True,
        )
        db.session.add(legacy_customer)
        db.session.commit()

        login = self.client.post(
            "/api/shops/corner-shop/customer/login",
            json={"email": "legacy@example.com", "password": "legacy-password"},
        )
        self.assertEqual(login.status_code, 200, login.json)
        self.assertIsNotNone(legacy_customer.customer_account_id)
        self.assertFalse(legacy_customer.portal_requires_password_reset)
        self.assertEqual(CustomerAccount.query.count(), 1)

    def test_shop_owner_url_and_storefront_settings_require_matching_business_membership(self):
        owner_token = self.client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "owner-password"},
        ).json["accessToken"]
        stranger_token = self.client.post(
            "/api/auth/login",
            json={"email": "other@example.com", "password": "other-password"},
        ).json["accessToken"]

        resolved = self.client.get(
            "/api/shops/corner-shop/owner",
            headers=self.headers(owner_token),
        )
        self.assertEqual(resolved.status_code, 200, resolved.json)
        self.assertEqual(resolved.json["slug"], "corner-shop")
        denied = self.client.get(
            "/api/shops/corner-shop/owner",
            headers=self.headers(stranger_token),
        )
        self.assertEqual(denied.status_code, 404)

        settings = self.client.put(
            "/api/shops/corner-shop/storefront/settings",
            json={
                "storefrontEnabled": False,
                "storefrontDescription": "Order in store.",
                "storefrontLogoUrl": None,
                "storefrontBrandColor": "#123456",
                "storefrontContactEmail": "shop@example.com",
                "storefrontContactPhone": "555-0100",
                "storefrontAddress": "1 Shop Street",
            },
            headers=self.headers(owner_token, self.shop.id),
        )
        self.assertEqual(settings.status_code, 200, settings.json)
        self.assertFalse(settings.json["storefrontEnabled"])

        unavailable_catalog = self.client.get("/api/shops/corner-shop/products")
        self.assertEqual(unavailable_catalog.status_code, 404)
        private_workspace = self.client.get(
            "/api/products",
            headers=self.headers(owner_token, self.shop.id),
        )
        self.assertEqual(private_workspace.status_code, 200, private_workspace.json)

    def test_customer_account_cannot_use_staff_or_platform_routes(self):
        registration = self.register_customer("corner-shop")
        headers = self.headers(registration.json["accessToken"])
        denied = self.client.get("/api/products", headers=headers)
        self.assertEqual(denied.status_code, 403)
        owner_route_denied = self.client.get(
            "/api/shops/corner-shop/owner",
            headers=headers,
        )
        self.assertEqual(owner_route_denied.status_code, 403)


if __name__ == "__main__":
    unittest.main()
