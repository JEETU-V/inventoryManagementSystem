from functools import wraps

from utils.errors import ApiError
from utils.tenancy import activate_business_for_request


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            _, membership = activate_business_for_request()
            allowed_membership_roles = set()
            if "admin" in roles:
                allowed_membership_roles.update({"owner", "manager"})
            if "staff" in roles:
                allowed_membership_roles.update({"owner", "manager", "staff"})
            if "viewer" in roles:
                allowed_membership_roles.update({"owner", "manager", "staff", "viewer"})
            if membership.role not in allowed_membership_roles:
                raise ApiError("Insufficient permissions", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator
