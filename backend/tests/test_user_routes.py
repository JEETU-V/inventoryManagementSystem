import unittest

from flask_jwt_extended import create_access_token

from app import create_app
from models import User, db
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class UserRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.admin = User(
            name="Admin",
            email="admin@example.com",
            password_hash=hash_password("test-password"),
            role="admin",
        )
        self.staff = User(
            name="Staff",
            email="staff@example.com",
            password_hash=hash_password("test-password"),
            role="staff",
        )
        db.session.add_all([self.admin, self.staff])
        db.session.commit()
        self.admin_headers = self.auth_headers(self.admin)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    @staticmethod
    def auth_headers(user):
        token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        return {"Authorization": f"Bearer {token}"}

    def test_admin_can_create_update_and_deactivate_users(self):
        created = self.client.post(
            "/api/users",
            json={
                "name": "  New Staff ",
                "email": "NEW@example.com",
                "password": "secure-password",
                "role": "staff",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json["name"], "New Staff")
        self.assertEqual(created.json["email"], "new@example.com")

        changed = self.client.put(
            f"/api/users/{created.json['id']}",
            json={"role": "viewer"},
            headers=self.admin_headers,
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json["role"], "viewer")

        disabled = self.client.put(
            f"/api/users/{created.json['id']}",
            json={"isActive": False},
            headers=self.admin_headers,
        )
        self.assertEqual(disabled.status_code, 200)
        self.assertFalse(disabled.json["isActive"])

        inactive_headers = self.auth_headers(db.session.get(User, created.json["id"]))
        rejected = self.client.get("/api/auth/me", headers=inactive_headers)
        self.assertEqual(rejected.status_code, 401)

    def test_rejects_duplicate_users_and_protects_last_admin(self):
        duplicate = self.client.post(
            "/api/users",
            json={
                "name": "Duplicate",
                "email": "ADMIN@example.com",
                "password": "secure-password",
                "role": "staff",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(duplicate.status_code, 409)

        last_admin = self.client.put(
            f"/api/users/{self.admin.id}",
            json={"role": "staff"},
            headers=self.admin_headers,
        )
        self.assertEqual(last_admin.status_code, 409)
        self.assertEqual(db.session.get(User, self.admin.id).role, "admin")

    def test_admin_cannot_change_own_role(self):
        response = self.client.put(
            f"/api/users/{self.admin.id}",
            json={"role": "staff"},
            headers=self.admin_headers,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(db.session.get(User, self.admin.id).role, "admin")

    def test_non_admin_cannot_manage_users_and_current_roles_are_enforced(self):
        denied = self.client.get("/api/users", headers=self.auth_headers(self.staff))
        self.assertEqual(denied.status_code, 403)

        self.staff.role = "viewer"
        db.session.commit()
        denied_after_role_change = self.client.post(
            "/api/products",
            json={"name": "Test", "sku": "TEST", "purchasePrice": 1, "quantity": 0, "price": 2, "reorderLevel": 1},
            headers=self.auth_headers(self.staff),
        )
        self.assertEqual(denied_after_role_change.status_code, 403)


if __name__ == "__main__":
    unittest.main()
