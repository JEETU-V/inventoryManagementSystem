from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError

from models import Business, BusinessMembership, RevokedToken, User, db
from schemas.validators import LoginSchema, RegistrationSchema, validate_payload
from services.serializers import user_to_dict
from utils.errors import ApiError
from utils.platform_admin import is_platform_admin
from utils.security import hash_password, verify_password
from utils.rate_limit import rate_limit
from utils.tenancy import make_business_slug

auth_bp = Blueprint("auth", __name__)


def _auth_user_payload(user, session_type="business"):
    return user_to_dict(user) | {
        "businesses": _business_memberships(user) if session_type == "business" else [],
        "isPlatformAdmin": session_type == "platform_admin" and is_platform_admin(user),
        "sessionType": session_type,
    }


def _business_memberships(user):
    return [
        {
            "id": membership.business.id,
            "name": membership.business.name,
            "slug": membership.business.slug,
            "businessType": membership.business.business_type,
            "status": membership.business.status,
            "role": membership.role,
        }
        for membership in user.memberships
        if membership.status == "active" and membership.business.status == "active"
    ]


@auth_bp.post("/login")
@rate_limit(max_requests=5, window_seconds=900)
def login():
    data = validate_payload(LoginSchema, request.get_json())
    user = User.query.filter_by(email=data["email"].lower()).first()
    if not user or not verify_password(data["password"], user.password_hash) or not user.is_active:
        raise ApiError("Invalid email or password", 401)

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "session_type": "business"},
    )
    return jsonify({
        "accessToken": token,
        "user": _auth_user_payload(user),
    })


@auth_bp.post("/platform-login")
@rate_limit(max_requests=5, window_seconds=900)
def platform_login():
    data = validate_payload(LoginSchema, request.get_json())
    user = User.query.filter_by(email=data["email"].lower()).first()
    if (
        not user
        or not verify_password(data["password"], user.password_hash)
        or not is_platform_admin(user)
    ):
        raise ApiError("Invalid administrator email or password", 401)

    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "session_type": "platform_admin",
        },
    )
    return jsonify({
        "accessToken": token,
        "user": _auth_user_payload(user, "platform_admin"),
    })


@auth_bp.post("/register")
@rate_limit(max_requests=5, window_seconds=3600)
def register():
    data = validate_payload(RegistrationSchema, request.get_json())
    if User.query.filter(db.func.lower(User.email) == data["email"]).first():
        raise ApiError("An account with this email already exists", 409)

    user = User(
        name=data["name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role="staff",
        is_active=True,
    )
    membership = None
    for attempt in range(3):
        business = Business(
            name=data["business_name"],
            slug=make_business_slug(data["business_name"]),
            business_type=data["business_type"],
            created_by=user,
        )
        membership = BusinessMembership(user=user, business=business, role="owner")
        db.session.add_all([user, business, membership])
        try:
            db.session.commit()
            break
        except IntegrityError as error:
            db.session.rollback()
            if User.query.filter_by(email=data["email"]).first():
                raise ApiError("An account with this email already exists", 409) from error
            if attempt == 2:
                raise ApiError("Unable to create a unique business workspace. Try again.", 409) from error

    if membership is None:
        raise RuntimeError("Business registration did not create an owner membership.")

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "session_type": "business"},
    )
    return jsonify({
        "accessToken": token,
        "user": _auth_user_payload(user),
        "business": {
            "id": business.id,
            "name": business.name,
            "slug": business.slug,
            "businessType": business.business_type,
            "status": business.status,
            "role": membership.role,
        },
    }), 201


@auth_bp.post("/logout")
@jwt_required()
def logout():
    claims = get_jwt()
    db.session.add(RevokedToken(
        jti=claims["jti"],
        expires_at=datetime.fromtimestamp(claims["exp"], tz=timezone.utc).replace(tzinfo=None),
    ))
    db.session.commit()
    return jsonify({"message": "Logged out"})


@auth_bp.get("/me")
@jwt_required()
def me():
    if get_jwt().get("portal"):
        raise ApiError("Business account authentication required", 403)
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        raise ApiError("User not found", 404)
    session_type = get_jwt().get("session_type", "business")
    if session_type not in {"business", "platform_admin"}:
        raise ApiError("Invalid authentication session", 401)
    if session_type == "platform_admin" and not is_platform_admin(user):
        raise ApiError("Platform administrator access required", 403)
    return jsonify(_auth_user_payload(user, session_type))


@auth_bp.post("/seed-admin")
def seed_admin():
    if current_app.config.get("IS_PRODUCTION"):
        raise ApiError("Seed endpoint is disabled in production", 403)

    email = current_app.config["DEFAULT_ADMIN_EMAIL"].lower()
    if not current_app.config.get("DEFAULT_ADMIN_PASSWORD"):
        raise ApiError("Configure DEFAULT_ADMIN_PASSWORD before seeding the administrator", 503)
    user = User.query.filter_by(email=email).first()
    if user:
        if not user.memberships:
            _create_default_business(user)
            db.session.commit()
        return jsonify(_auth_user_payload(user, "business"))

    user = User(
        name="Admin",
        email=email,
        password_hash=hash_password(current_app.config["DEFAULT_ADMIN_PASSWORD"]),
        role="admin",
    )
    db.session.add(user)
    db.session.commit()
    _create_default_business(user)
    db.session.commit()
    return jsonify(_auth_user_payload(user, "business")), 201


def _create_default_business(user):
    business = Business(
        name=f"{user.name}'s Business",
        slug=make_business_slug(f"{user.name}-business"),
        business_type="retail",
        created_by=user,
    )
    db.session.add(
        BusinessMembership(user=user, business=business, role="owner", status="active")
    )
    db.session.add(business)
