import os
import subprocess
import sys
import unittest

from sqlalchemy import inspect, text

from app import create_app, initialize_fresh_database
from flask import g
from models import Business, BusinessMembership, RevokedToken, User, db
from routes.bills import _company_info
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret-key-at-least-32-characters"
    JWT_SECRET_KEY = "test-jwt-secret-key-at-least-32-characters"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"
    IS_PRODUCTION = False
    DEFAULT_ADMIN_EMAIL = "platform@example.com"
    DEFAULT_ADMIN_PASSWORD = "secure-test-password"
    PLATFORM_ADMIN_EMAILS = ("platform@example.com",)
    ENABLE_SUPPLIER_PDF_UPLOADS = True
    COMPANY_NAME = "Default Shop"
    COMPANY_ADDRESS = "Default address"
    COMPANY_PHONE = "000"
    COMPANY_EMAIL = "default@example.com"
    COMPANY_GST_NUMBER = ""


class ProductionReadinessTests(unittest.TestCase):
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

    def test_fresh_database_bootstrap_creates_owner_and_stamps_head(self):
        db.drop_all()
        initialize_fresh_database(self.app)

        self.assertEqual(User.query.count(), 1)
        self.assertEqual(Business.query.count(), 1)
        self.assertEqual(BusinessMembership.query.count(), 1)
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        self.assertIn("alembic_version", inspect(db.engine).get_table_names())

        with self.assertRaisesRegex(RuntimeError, "requires an empty database"):
            initialize_fresh_database(self.app)

    def test_health_check_reports_an_uninitialized_database(self):
        db.drop_all()
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["database"], "connected")
        self.assertEqual(response.json["schema"], "not_initialized")

    def test_health_check_rejects_an_outdated_migration_revision(self):
        db.create_all()
        with db.engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"
                )
            )
            connection.execute(
                text(
                    "INSERT INTO alembic_version (version_num) VALUES ('old-revision')"
                )
            )

        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["schema"], "migration_required")

    def test_registration_seed_endpoint_is_disabled_in_production(self):
        self.app.config["IS_PRODUCTION"] = True
        response = self.client.post("/api/auth/seed-admin")
        self.assertEqual(response.status_code, 403)

    def test_production_supplier_pdf_route_is_disabled(self):
        self.app.config["ENABLE_SUPPLIER_PDF_UPLOADS"] = False
        user = User(
            name="Shop Owner",
            email="pdf-owner@example.com",
            password_hash=hash_password("owner-password"),
            role="staff",
        )
        db.session.add(user)
        db.session.flush()
        business = Business(
            name="PDF Shop",
            slug="pdf-shop",
            business_type="retail",
            created_by=user,
        )
        db.session.add(business)
        db.session.flush()
        db.session.add(BusinessMembership(user=user, business=business, role="owner"))
        db.session.commit()
        token = self.client.post(
            "/api/auth/login",
            json={"email": "pdf-owner@example.com", "password": "owner-password"},
        ).json["accessToken"]

        response = self.client.post(
            "/api/supplier-pdf/upload/1",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Business-Id": str(business.id),
            },
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("persistent file storage", response.json["message"])

    def test_bill_uses_the_active_business_branding(self):
        user = User(
            name="Shop Owner",
            email="billing-owner@example.com",
            password_hash=hash_password("owner-password"),
            role="staff",
        )
        db.session.add(user)
        db.session.flush()
        business = Business(
            name="Corner Store",
            slug="corner-store",
            business_type="retail",
            created_by=user,
            storefront_address="1 Shop Road",
            storefront_contact_phone="555-0101",
            storefront_contact_email="billing@corner.example",
        )
        db.session.add(business)
        db.session.flush()

        with self.app.test_request_context():
            g.business_id = business.id
            company = _company_info()

        self.assertEqual(company["name"], "Corner Store")
        self.assertEqual(company["address"], "1 Shop Road")
        self.assertEqual(company["phone"], "555-0101")
        self.assertEqual(company["email"], "billing@corner.example")

    def test_logout_revokes_the_access_token(self):
        user = User(
            name="Shop Owner",
            email="owner@example.com",
            password_hash=hash_password("owner-password"),
            role="staff",
        )
        db.session.add(user)
        db.session.flush()
        business = Business(
            name="Corner Shop",
            slug="corner-shop",
            business_type="retail",
            created_by=user,
        )
        db.session.add(business)
        db.session.flush()
        db.session.add(BusinessMembership(user=user, business=business, role="owner"))
        db.session.commit()
        token = self.client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "owner-password"},
        ).json["accessToken"]

        logout = self.client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(RevokedToken.query.count(), 1)
        revoked_request = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(revoked_request.status_code, 401)

    def test_login_rate_limit_is_persistent_and_returns_retry_after(self):
        responses = [
            self.client.post(
                "/api/auth/login",
                json={"email": "missing@example.com", "password": "incorrect"},
            )
            for _ in range(6)
        ]
        self.assertEqual([response.status_code for response in responses[:5]], [401] * 5)
        self.assertEqual(responses[5].status_code, 429)
        self.assertGreater(int(responses[5].headers["Retry-After"]), 0)

    def test_production_settings_require_secrets_and_mysql(self):
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        base_env = {"PATH": os.environ.get("PATH", ""), "VERCEL": "1"}
        missing = subprocess.run(
            [sys.executable, "-c", "from config import Config"],
            cwd=backend_dir,
            env=base_env,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(missing.returncode, 0)
        self.assertIn("DATABASE_URL", missing.stderr)

        environment = base_env | {
            "SECRET_KEY": "s" * 40,
            "JWT_SECRET_KEY": "j" * 40,
            "DATABASE_URL": "mysql+pymysql://user:pass@db.example/app",
            "PLATFORM_ADMIN_EMAILS": "platform@example.com",
        }
        configured = subprocess.run(
            [
                sys.executable,
                "-c",
                "from config import Config; "
                "assert Config.IS_PRODUCTION; "
                "assert Config.DEFAULT_ADMIN_PASSWORD is None; "
                "assert not Config.ENABLE_SUPPLIER_PDF_UPLOADS",
            ],
            cwd=backend_dir,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(configured.returncode, 0, configured.stderr)


if __name__ == "__main__":
    unittest.main()
