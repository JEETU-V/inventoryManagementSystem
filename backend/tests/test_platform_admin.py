import unittest

from flask_jwt_extended import create_access_token

from app import create_app
from models import Business, BusinessMembership, Customer, Product, User, db
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"
    PLATFORM_ADMIN_EMAILS = ("platform@example.com",)


class PlatformAdminTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.platform_admin = self._user("Platform Admin", "platform@example.com", "admin")
        self.business_owner = self._user("Shop Owner", "owner@example.com", "staff")
        self.non_platform_admin = self._user("Business Admin", "admin@example.com", "admin")
        db.session.flush()
        self.business = Business(
            name="Corner Shop",
            slug="corner-shop",
            business_type="retail",
            created_by=self.business_owner,
        )
        db.session.add(self.business)
        db.session.flush()
        db.session.add_all([
            BusinessMembership(
                user=self.business_owner,
                business=self.business,
                role="owner",
            ),
            BusinessMembership(
                user=self.platform_admin,
                business=self.business,
                role="owner",
            ),
            BusinessMembership(
                user=self.non_platform_admin,
                business=self.business,
                role="manager",
            ),
            Customer(
                business_id=self.business.id,
                name="Buyer",
                phone="555-0100",
                email="buyer@example.com",
                address="1 Main Street",
            ),
            Product(
                business_id=self.business.id,
                name="Notebook",
                sku="NOTE-1",
                category="Paper",
                purchase_price=2,
                quantity=5,
                price=4,
            ),
        ])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    @staticmethod
    def _user(name, email, role):
        user = User(
            name=name,
            email=email,
            password_hash=hash_password("test-password"),
            role=role,
        )
        db.session.add(user)
        return user

    @staticmethod
    def _headers(user, session_type="business"):
        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role, "session_type": session_type},
        )
        return {"Authorization": f"Bearer {token}"}

    def test_only_allowlisted_platform_admin_can_view_cross_business_overview(self):
        login = self.client.post(
            "/api/auth/platform-login",
            json={"email": "platform@example.com", "password": "test-password"},
        )
        self.assertEqual(login.status_code, 200, login.json)
        self.assertEqual(login.json["user"]["sessionType"], "platform_admin")
        self.assertTrue(login.json["user"]["isPlatformAdmin"])
        self.assertEqual(login.json["user"]["businesses"], [])

        allowed = self.client.get(
            "/api/platform-admin/summary",
            headers={"Authorization": f"Bearer {login.json['accessToken']}"},
        )
        self.assertEqual(allowed.status_code, 200, allowed.json)
        self.assertEqual(allowed.json["metrics"]["businesses"], 1)
        self.assertEqual(
            set(allowed.json["metrics"]),
            {
                "businesses",
                "activeBusinesses",
                "suspendedBusinesses",
                "ownerAccounts",
                "activeOwnerAccounts",
                "activeMemberships",
            },
        )
        self.assertEqual(allowed.json["businesses"][0]["slug"], "corner-shop")
        self.assertNotIn("products", allowed.json["businesses"][0])
        self.assertNotIn("customers", allowed.json["businesses"][0])

        denied = self.client.get(
            "/api/platform-admin/summary",
            headers=self._headers(self.non_platform_admin),
        )
        self.assertEqual(denied.status_code, 403)

    def test_platform_session_cannot_access_business_data(self):
        login = self.client.post(
            "/api/auth/platform-login",
            json={"email": "platform@example.com", "password": "test-password"},
        )
        headers = {"Authorization": f"Bearer {login.json['accessToken']}"}

        products = self.client.get("/api/products", headers=headers)
        self.assertEqual(products.status_code, 403)
        businesses = self.client.get("/api/businesses", headers=headers)
        self.assertEqual(businesses.status_code, 403)

    def test_allowlisted_account_business_session_cannot_access_platform_data(self):
        login = self.client.post(
            "/api/auth/login",
            json={"email": "platform@example.com", "password": "test-password"},
        )
        self.assertEqual(login.status_code, 200, login.json)
        self.assertEqual(login.json["user"]["sessionType"], "business")
        products = self.client.get(
            "/api/products",
            headers={"Authorization": f"Bearer {login.json['accessToken']}"},
        )
        self.assertEqual(products.status_code, 200, products.json)
        self.assertEqual(len(products.json), 1)
        denied = self.client.get(
            "/api/platform-admin/summary",
            headers={"Authorization": f"Bearer {login.json['accessToken']}"},
        )
        self.assertEqual(denied.status_code, 403)

    def test_business_admin_role_alone_does_not_grant_platform_access(self):
        response = self.client.post(
            "/api/auth/login",
            json={"email": "admin@example.com", "password": "test-password"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json["user"]["isPlatformAdmin"])
        denied = self.client.get(
            "/api/platform-admin/summary",
            headers={"Authorization": f"Bearer {response.json['accessToken']}"},
        )
        self.assertEqual(denied.status_code, 403)

    def test_missing_authentication_is_rejected(self):
        response = self.client.get("/api/platform-admin/summary")
        self.assertEqual(response.status_code, 401)

    def test_platform_admin_can_suspend_and_reactivate_business_access(self):
        headers = self._headers(self.platform_admin, "platform_admin")
        business_headers = self._headers(self.business_owner)

        suspended = self.client.put(
            f"/api/platform-admin/businesses/{self.business.id}/status",
            json={"status": "suspended"},
            headers=headers,
        )
        self.assertEqual(suspended.status_code, 200, suspended.json)
        self.assertEqual(suspended.json["status"], "suspended")
        blocked = self.client.get("/api/products", headers=business_headers)
        self.assertEqual(blocked.status_code, 403)

        reactivated = self.client.put(
            f"/api/platform-admin/businesses/{self.business.id}/status",
            json={"status": "active"},
            headers=headers,
        )
        self.assertEqual(reactivated.status_code, 200, reactivated.json)
        allowed = self.client.get("/api/products", headers=business_headers)
        self.assertEqual(allowed.status_code, 200, allowed.json)

    def test_platform_admin_can_manage_manual_plans_and_assign_them(self):
        headers = self._headers(self.platform_admin, "platform_admin")
        created = self.client.post(
            "/api/platform-admin/plans",
            json={
                "name": "Starter",
                "description": "Small business plan",
                "monthlyPrice": "19.99",
                "annualPrice": "199.00",
                "isActive": True,
            },
            headers=headers,
        )
        self.assertEqual(created.status_code, 201, created.json)
        plan_id = created.json["id"]

        assigned = self.client.put(
            f"/api/platform-admin/businesses/{self.business.id}/plan",
            json={"planId": plan_id},
            headers=headers,
        )
        self.assertEqual(assigned.status_code, 200, assigned.json)
        self.assertEqual(assigned.json["subscriptionPlan"], "Starter")

        plans = self.client.get("/api/platform-admin/plans", headers=headers)
        self.assertEqual(plans.status_code, 200, plans.json)
        self.assertEqual(plans.json[0]["assignedBusinesses"], 1)

        duplicate = self.client.post(
            "/api/platform-admin/plans",
            json={
                "name": "starter",
                "monthlyPrice": 20,
                "annualPrice": 200,
            },
            headers=headers,
        )
        self.assertEqual(duplicate.status_code, 409)

    def test_platform_admin_can_manage_owner_status_and_owner_cannot_suspend_admin(self):
        headers = self._headers(self.platform_admin, "platform_admin")
        disabled = self.client.put(
            f"/api/platform-admin/owners/{self.business_owner.id}/status",
            json={"isActive": False},
            headers=headers,
        )
        self.assertEqual(disabled.status_code, 200, disabled.json)
        self.assertFalse(disabled.json["isActive"])

        login = self.client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "test-password"},
        )
        self.assertEqual(login.status_code, 401)

        protected = self.client.put(
            f"/api/platform-admin/owners/{self.platform_admin.id}/status",
            json={"isActive": False},
            headers=headers,
        )
        self.assertEqual(protected.status_code, 403)

    def test_support_cases_and_audit_logs_are_platform_admin_only(self):
        headers = self._headers(self.platform_admin, "platform_admin")
        created = self.client.post(
            "/api/platform-admin/support-cases",
            json={
                "businessId": self.business.id,
                "subject": "Login issue",
                "description": "Investigate the owner sign-in issue.",
                "priority": "high",
            },
            headers=headers,
        )
        self.assertEqual(created.status_code, 201, created.json)
        self.assertEqual(created.json["businessName"], "Corner Shop")
        self.assertEqual(created.json["status"], "open")

        updated = self.client.put(
            f"/api/platform-admin/support-cases/{created.json['id']}/status",
            json={"status": "resolved"},
            headers=headers,
        )
        self.assertEqual(updated.status_code, 200, updated.json)
        self.assertEqual(updated.json["status"], "resolved")

        audit = self.client.get("/api/platform-admin/audit-logs", headers=headers)
        self.assertEqual(audit.status_code, 200, audit.json)
        self.assertGreaterEqual(len(audit.json), 2)
        self.assertTrue(all(entry["actorEmail"] == "platform@example.com" for entry in audit.json))

        denied = self.client.get(
            "/api/platform-admin/audit-logs",
            headers=self._headers(self.business_owner),
        )
        self.assertEqual(denied.status_code, 403)

    def test_owner_listing_and_platform_health_do_not_expose_tenant_operations(self):
        headers = self._headers(self.platform_admin, "platform_admin")
        owners = self.client.get("/api/platform-admin/owners", headers=headers)
        self.assertEqual(owners.status_code, 200, owners.json)
        self.assertEqual(
            {owner["email"] for owner in owners.json},
            {"owner@example.com", "platform@example.com"},
        )
        self.assertNotIn("password", owners.json[0])

        health = self.client.get("/api/platform-admin/health", headers=headers)
        self.assertEqual(health.status_code, 200, health.json)
        self.assertEqual(health.json["status"], "ok")
        self.assertNotIn("databaseUrl", health.json)


if __name__ == "__main__":
    unittest.main()
