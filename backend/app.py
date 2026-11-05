import os

import click
from alembic.script import ScriptDirectory
from flask import Flask, current_app, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate, stamp
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from config import Config
from models import (
    Business,
    BusinessMembership,
    Customer,
    CustomerAccount,
    RevokedToken,
    User,
    db,
)
from routes import register_blueprints
from utils.errors import ApiError
from utils.security import hash_password

jwt = JWTManager()
migrate = Migrate()


def create_app(config_class=Config):
    app_options = {}
    if os.getenv("VERCEL"):
        app_options["instance_path"] = os.getenv(
            "FLASK_INSTANCE_PATH",
            "/tmp/inventory-management-system",
        )
    app = Flask(__name__, **app_options)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db, directory="migrations/alembic")
    jwt.init_app(app)

    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Business-Id"],
    )

    register_blueprints(app)
    register_error_handlers(app)
    register_jwt_handlers(app)

    @app.cli.command("init-fresh-db")
    def init_fresh_db_command():
        """Create and stamp the current schema in a completely empty database."""
        try:
            initialize_fresh_database(app)
        except (RuntimeError, SQLAlchemyError) as error:
            raise click.ClickException(str(error)) from error
        click.echo("Fresh database initialized and stamped at the current migration head.")

    @app.get("/api/health")
    def health_check():
        try:
            db.session.execute(text("SELECT 1"))
        except SQLAlchemyError:
            current_app.logger.exception("Database health check failed")
            return jsonify({
                "status": "degraded",
                "database": "unavailable",
                "schema": "unknown",
            }), 503

        try:
            inspector = inspect(db.engine)
            table_names = set(inspector.get_table_names())
            required_tables = set(db.metadata.tables)
            if not required_tables.issubset(table_names) or "alembic_version" not in table_names:
                return jsonify({
                    "status": "degraded",
                    "database": "connected",
                    "schema": "not_initialized",
                }), 503

            config = current_app.extensions["migrate"].migrate.get_config()
            expected_revision = ScriptDirectory.from_config(config).get_current_head()
            current_revisions = db.session.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalars().all()
        except SQLAlchemyError:
            current_app.logger.exception("Database schema readiness check failed")
            return jsonify({
                "status": "degraded",
                "database": "connected",
                "schema": "not_initialized",
            }), 503
        schema_ready = current_revisions == [expected_revision]

        return jsonify({
            "status": "ok" if schema_ready else "degraded",
            "database": "connected",
            "schema": "ready" if schema_ready else "migration_required",
        }), 200 if schema_ready else 503

    return app


def initialize_fresh_database(app):
    with app.app_context():
        if inspect(db.engine).get_table_names():
            raise RuntimeError(
                "Fresh database initialization requires an empty database. "
                "For an existing database, back it up and run `flask db upgrade`."
            )

        admin_email = current_app.config.get("DEFAULT_ADMIN_EMAIL")
        admin_password = current_app.config.get("DEFAULT_ADMIN_PASSWORD")
        if not admin_email or not admin_password:
            raise RuntimeError(
                "Set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD before "
                "initializing a fresh database."
            )
        admin_email = admin_email.strip().lower()
        if current_app.config.get("IS_PRODUCTION") and admin_email not in current_app.config[
            "PLATFORM_ADMIN_EMAILS"
        ]:
            raise RuntimeError(
                "The initial administrator email must be included in "
                "PLATFORM_ADMIN_EMAILS."
            )

        db.create_all()
        admin = User(
            name="Platform Administrator",
            email=admin_email,
            password_hash=hash_password(admin_password),
            role="admin",
            is_active=True,
        )
        business = Business(
            name="Administrator's Business",
            slug="administrator-business",
            business_type="retail",
            created_by=admin,
        )
        db.session.add_all([
            admin,
            business,
            BusinessMembership(user=admin, business=business, role="owner"),
        ])
        db.session.commit()
        stamp(revision="head")


def register_jwt_handlers(app):
    @jwt.token_in_blocklist_loader
    def reject_inactive_users(jwt_header, jwt_payload):
        token_id = jwt_payload.get("jti")
        if not token_id or db.session.get(RevokedToken, token_id):
            return True
        try:
            user_id = int(jwt_payload["sub"])
        except (KeyError, TypeError, ValueError):
            return True
        if jwt_payload.get("portal") == "customer":
            if jwt_payload.get("shop_customer_account"):
                account = db.session.get(CustomerAccount, user_id)
                return account is None or not account.is_active
            customer = db.session.get(Customer, user_id)
            return (
                customer is None
                or not customer.portal_password_hash
                or customer.business.status != "active"
            )
        user = db.session.get(User, user_id)
        return user is None or not user.is_active

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"message": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"message": "Invalid token"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"message": "Authorization required"}), 401


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(error):
        response = jsonify({"message": error.message, "details": error.details})
        response.status_code = error.status_code
        for name, value in error.headers.items():
            response.headers[name] = value
        return response

    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({"message": "Bad request"}), 400

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(422)
    def handle_unprocessable(error):
        return jsonify({"message": "Validation failed"}), 422

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception(error)
        return jsonify({"message": "Internal server error"}), 500


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
