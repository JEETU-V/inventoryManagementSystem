import re
from functools import wraps

from flask import g, has_request_context, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

from models import Business, BusinessMembership, BusinessScoped, User, db
from utils.errors import ApiError


@event.listens_for(Session, "do_orm_execute")
def scope_business_queries(execute_state):
    business_id = getattr(g, "business_id", None) if has_request_context() else None
    if execute_state.is_select and business_id is not None:
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                BusinessScoped,
                lambda model: model.business_id == business_id,
                include_aliases=True,
            )
        )


@event.listens_for(Session, "before_flush")
def assign_and_validate_business(session, flush_context, instances):
    business_id = getattr(g, "business_id", None) if has_request_context() else None
    if business_id is None:
        return

    for record in session.new.union(session.dirty):
        if not isinstance(record, BusinessScoped):
            continue
        if record.business_id is None:
            record.business_id = business_id
        elif record.business_id != business_id:
            raise ApiError("Record belongs to a different business", 403)


def activate_business_for_request():
    verify_jwt_in_request()
    claims = get_jwt()
    if claims.get("portal") or claims.get("session_type", "business") != "business":
        raise ApiError("Business workspace access requires a business sign-in", 403)
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        raise ApiError("Active user account required", 403)

    memberships = (
        BusinessMembership.query.join(Business)
        .filter(
            BusinessMembership.user_id == user_id,
            BusinessMembership.status == "active",
            Business.status == "active",
        )
        .order_by(BusinessMembership.business_id)
        .all()
    )
    requested_business = request.headers.get("X-Business-Id")
    if requested_business:
        try:
            business_id = int(requested_business)
        except ValueError as error:
            raise ApiError("X-Business-Id must be a valid business ID", 400) from error
        membership = next((item for item in memberships if item.business_id == business_id), None)
    elif len(memberships) == 1:
        membership = memberships[0]
    elif len(memberships) > 1:
        raise ApiError("Choose an active business using X-Business-Id", 400)
    else:
        raise ApiError("An active business membership is required", 403)

    if membership is None:
        raise ApiError("Business membership not found", 404)

    g.business_id = membership.business_id
    g.business_role = membership.role
    g.user_id = user_id
    return user, membership


def business_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        activate_business_for_request()
        return fn(*args, **kwargs)

    return wrapper


def require_business_session(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("portal") or claims.get("session_type", "business") != "business":
            raise ApiError("Business workspace access requires a business sign-in", 403)
        return fn(*args, **kwargs)

    return wrapper


def make_business_slug(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:100].strip("-")
    if not slug:
        raise ApiError("Business name must contain letters or numbers", 422)

    candidate = slug
    suffix = 2
    while Business.query.filter_by(slug=candidate).first():
        candidate = f"{slug[:110 - len(str(suffix))]}-{suffix}"
        suffix += 1
    return candidate
