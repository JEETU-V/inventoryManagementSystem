from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

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
    
    # Enable CORS for all routes and origins
    CORS(app, 
         origins="*",
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"])

    register_blueprints(app)
    register_error_handlers(app)

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    return app


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

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception(error)
        return jsonify({"message": "Internal server error"}), 500


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)

