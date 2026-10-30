from functools import wraps

from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from models import User, db
from utils.errors import ApiError


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())
            user = db.session.get(User, user_id)
            if not user or not user.is_active:
                raise ApiError("Active user account required", 403)
            if user.role not in roles:
                raise ApiError("Insufficient permissions", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator
