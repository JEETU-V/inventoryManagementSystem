from flask import Blueprint, g, jsonify, request

from models import BusinessMembership, User, db
from schemas.validators import UserSchema, validate_payload
from services.serializers import user_to_dict
from utils.errors import ApiError
from utils.permissions import role_required
from utils.security import hash_password

users_bp = Blueprint("users", __name__)


def membership_to_dict(membership):
    user = membership.user
    return user_to_dict(user) | {
        "role": "admin" if membership.role in {"owner", "manager"} else membership.role,
        "isActive": membership.status == "active" and user.is_active,
    }


def _role_from_payload(role):
    return "manager" if role == "admin" else role


def _role_for_payload(role):
    return "admin" if role in {"owner", "manager"} else role


@users_bp.get("")
@role_required("admin")
def list_users():
    memberships = (
        BusinessMembership.query.filter_by(business_id=g.business_id)
        .join(User)
        .order_by(User.name.asc())
        .all()
    )
    return jsonify([membership_to_dict(membership) for membership in memberships])


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
        role="staff",
        is_active=True,
    )
    membership = BusinessMembership(
        user=user,
        business_id=g.business_id,
        role=_role_from_payload(data["role"]),
        status="active",
    )
    db.session.add_all([user, membership])
    db.session.commit()
    return jsonify(membership_to_dict(membership)), 201


@users_bp.put("/<int:user_id>")
@role_required("admin")
def update_user(user_id):
    membership = BusinessMembership.query.filter_by(
        user_id=user_id,
        business_id=g.business_id,
    ).first()
    if not membership or not membership.user:
        raise ApiError("User not found", 404)

    data = validate_payload(UserSchema, request.get_json(), partial=True)
    if not data:
        raise ApiError("At least one account field is required", 422)
    if data.get("password"):
        raise ApiError("Password changes must use the account recovery flow", 422)

    if "email" in data and User.query.filter(
        db.func.lower(User.email) == data["email"],
        User.id != user_id,
    ).first():
        raise ApiError("An account with this email already exists", 409)

    new_role = _role_from_payload(data.get("role", _role_for_payload(membership.role)))
    new_status = "active" if data.get("is_active", membership.status == "active") else "suspended"
    if user_id == g.user_id and new_role != membership.role:
        raise ApiError("Use another business administrator to change your own role", 409)
    loses_owner_access = membership.role in {"owner", "manager"} and (
        new_role not in {"owner", "manager"} or new_status != "active"
    )
    if loses_owner_access:
        other_admins = BusinessMembership.query.filter(
            BusinessMembership.business_id == g.business_id,
            BusinessMembership.user_id != user_id,
            BusinessMembership.role.in_(["owner", "manager"]),
            BusinessMembership.status == "active",
        ).count()
        if other_admins == 0:
            raise ApiError("The last active business administrator cannot be disabled or demoted", 409)

    if user_id == g.user_id and new_status != "active":
        raise ApiError("You cannot deactivate your own membership", 409)

    user = membership.user
    for field in ("name", "email"):
        if field in data:
            setattr(user, field, data[field])
    membership.role = new_role
    membership.status = new_status
    db.session.commit()
    return jsonify(membership_to_dict(membership))
