from functools import wraps

from flask import current_app
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from models import User, db
from utils.errors import ApiError


def is_platform_admin(user):
    allowlist = current_app.config.get("PLATFORM_ADMIN_EMAILS", ())
    if isinstance(allowlist, str):
        allowlist = allowlist.split(",")
    authorized_emails = {email.strip().lower() for email in allowlist if email.strip()}
    return bool(user and user.is_active and user.email.lower() in authorized_emails)


def platform_admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if get_jwt().get("session_type") != "platform_admin":
            raise ApiError("Sign in through the platform administrator portal", 403)
        try:
            user_id = int(get_jwt_identity())
        except (TypeError, ValueError) as error:
            raise ApiError("Platform administrator authentication required", 403) from error
        user = db.session.get(User, user_id)
        if not is_platform_admin(user):
            raise ApiError("Platform administrator access required", 403)
        return fn(*args, **kwargs)

    return wrapper
