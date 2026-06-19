from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from models import User, db
from schemas.validators import LoginSchema, validate_payload
from services.serializers import user_to_dict
from utils.errors import ApiError
from utils.security import hash_password, verify_password

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    data = validate_payload(LoginSchema, request.get_json())
    user = User.query.filter_by(email=data["email"].lower()).first()
    if not user or not verify_password(data["password"], user.password_hash) or not user.is_active:
        raise ApiError("Invalid email or password", 401)

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"accessToken": token, "user": user_to_dict(user)})


@auth_bp.post("/logout")
@jwt_required()
def logout():
    return jsonify({"message": "Logged out"})


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        raise ApiError("User not found", 404)
    return jsonify(user_to_dict(user))


@auth_bp.post("/seed-admin")
def seed_admin():
    if current_app.config.get("FLASK_ENV") == "production":
        raise ApiError("Seed endpoint is disabled in production", 403)

    email = current_app.config["DEFAULT_ADMIN_EMAIL"].lower()
    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify(user_to_dict(user))

    user = User(
        name="Admin",
        email=email,
        password_hash=hash_password(current_app.config["DEFAULT_ADMIN_PASSWORD"]),
        role="admin",
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user_to_dict(user)), 201
