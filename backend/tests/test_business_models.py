import unittest

from sqlalchemy.exc import IntegrityError

from app import create_app
from models import Business, BusinessMembership, Category, User, db
from utils.security import hash_password


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = []
    FLASK_ENV = "testing"


class BusinessModelTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.user = User(
            name="Business Owner",
            email="owner@example.com",
            password_hash=hash_password("test-password"),
            role="staff",
        )
        db.session.add(self.user)
        db.session.flush()
        self.business = Business(
            name="Corner Shop",
            slug="corner-shop",
            business_type="retail",
            created_by=self.user,
        )
        db.session.add(self.business)
        db.session.flush()

    def tearDown(self):
        db.session.rollback()
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.app_context.pop()

    def test_user_can_have_business_specific_memberships(self):
        first_membership = BusinessMembership(
            user=self.user,
            business=self.business,
            role="owner",
        )
        second_business = Business(
            name="Wholesale Store",
            slug="wholesale-store",
            business_type="wholesale",
            created_by=self.user,
        )
        second_membership = BusinessMembership(
            user=self.user,
            business=second_business,
            role="staff",
        )
        db.session.add_all([first_membership, second_business, second_membership])
        db.session.commit()

        self.assertCountEqual(
            self.user.memberships,
            [first_membership, second_membership],
        )
        self.assertEqual(self.business.memberships, [first_membership])
        self.assertEqual(first_membership.business.created_by, self.user)

    def test_duplicate_membership_is_rejected(self):
        db.session.add(
            BusinessMembership(
                user=self.user,
                business=self.business,
                role="owner",
            )
        )
        db.session.commit()
        db.session.add(
            BusinessMembership(
                user=self.user,
                business=self.business,
                role="staff",
            )
        )

        with self.assertRaises(IntegrityError):
            db.session.commit()

    def test_business_role_values_are_constrained(self):
        db.session.add(
            BusinessMembership(
                user=self.user,
                business=self.business,
                role="platform_admin",
            )
        )

        with self.assertRaises(IntegrityError):
            db.session.commit()

    def test_business_scoped_records_require_a_business(self):
        db.session.add(Category(name="Unassigned"))

        with self.assertRaises(IntegrityError):
            db.session.commit()


if __name__ == "__main__":
    unittest.main()
