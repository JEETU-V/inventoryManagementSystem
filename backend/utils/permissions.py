from functools import wraps

from flask_jwt_extended import get_jwt, verify_jwt_in_request

from utils.errors import ApiError


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                raise ApiError("Insufficient permissions", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator

