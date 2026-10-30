from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from models import User, db
from schemas.validators import UserSchema, validate_payload
from services.serializers import user_to_dict
from utils.errors import ApiError
from utils.permissions import role_required
from utils.security import hash_password

users_bp = Blueprint("users", __name__)


@users_bp.get("")
@role_required("admin")
def list_users():
    users = User.query.order_by(User.name.asc()).all()
    return jsonify([user_to_dict(user) | {"isActive": user.is_active} for user in users])


@users_bp.post("")
@role_required("admin")
def create_user():
    data = validate_payload(UserSchema, request.get_json())
    if not data.get("password"):
        raise ApiError("A password of at least 8 characters is required", 422)
    if User.query.filter(db.func.lower(User.email) == data["email"]).first():
        raise ApiError("An account with this email already exists", 409)

    user = User(
        name=data["name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role=data["role"],
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user_to_dict(user) | {"isActive": user.is_active}), 201


@users_bp.put("/<int:user_id>")
@role_required("admin")
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        raise ApiError("User not found", 404)

    data = validate_payload(UserSchema, request.get_json(), partial=True)
    if not data:
        raise ApiError("At least one account field is required", 422)

    email = data.get("email")
    if email and User.query.filter(
        db.func.lower(User.email) == email,
        User.id != user_id,
    ).first():
        raise ApiError("An account with this email already exists", 409)

    new_role = data.get("role", user.role)
    is_active = data.get("is_active", user.is_active)
    if user_id == int(get_jwt_identity()) and new_role != user.role:
        raise ApiError("Use another administrator to change your own role", 409)
    loses_admin_access = user.role == "admin" and user.is_active and (
        new_role != "admin" or not is_active
    )
    if loses_admin_access:
        other_admins = User.query.filter(
            User.id != user_id,
            User.role == "admin",
            User.is_active.is_(True),
        ).count()
        if other_admins == 0:
            raise ApiError("The last active administrator cannot be disabled or demoted", 409)

    if user_id == int(get_jwt_identity()) and not is_active:
        raise ApiError("You cannot deactivate your own account", 409)

    for field in ("name", "email", "role", "is_active"):
        if field in data:
            setattr(user, field, data[field])
    if data.get("password"):
        user.password_hash = hash_password(data["password"])

    db.session.commit()
    return jsonify(user_to_dict(user) | {"isActive": user.is_active})
