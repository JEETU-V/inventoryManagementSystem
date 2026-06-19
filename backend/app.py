from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from sqlalchemy import text

from config import Config
from models import db
from routes import register_blueprints
from utils.errors import ApiError

jwt = JWTManager()
migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    register_blueprints(app)
    register_error_handlers(app)
    register_jwt_handlers(app)

    @app.get("/api/health")
    def health_check():
        try:
            db.session.execute(text("SELECT 1"))
            db_status = "connected"
        except Exception:
            db_status = "unavailable"

        return jsonify({
            "status": "ok" if db_status == "connected" else "degraded",
            "database": db_status,
        })

    return app


def register_jwt_handlers(app):
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
        return jsonify({"message": error.message, "details": error.details}), error.status_code

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
