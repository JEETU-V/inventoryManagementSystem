from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from models import Business, BusinessMembership, db
from schemas.validators import BusinessSchema, validate_payload
from utils.errors import ApiError
from utils.tenancy import make_business_slug, require_business_session

businesses_bp = Blueprint("businesses", __name__)


def business_to_dict(business, role):
    return {
        "id": business.id,
        "name": business.name,
        "slug": business.slug,
        "businessType": business.business_type,
        "status": business.status,
        "role": role,
    }


@businesses_bp.get("")
@jwt_required()
@require_business_session
def list_businesses():
    user_id = int(get_jwt_identity())
    memberships = (
        BusinessMembership.query.join(Business)
        .filter(
            BusinessMembership.user_id == user_id,
            BusinessMembership.status == "active",
            Business.status == "active",
        )
        .order_by(Business.name)
        .all()
    )
    return jsonify([business_to_dict(item.business, item.role) for item in memberships])


@businesses_bp.post("")
@jwt_required()
@require_business_session
def create_business():
    user_id = int(get_jwt_identity())
    data = validate_payload(BusinessSchema, request.get_json())
    membership = None
    for attempt in range(3):
        business = Business(
            name=data["name"],
            slug=make_business_slug(data["name"]),
            business_type=data["business_type"],
            created_by_id=user_id,
        )
        membership = BusinessMembership(user_id=user_id, business=business, role="owner")
        db.session.add_all([business, membership])
        try:
            db.session.commit()
            break
        except IntegrityError as error:
            db.session.rollback()
            if attempt == 2:
                raise ApiError("Unable to create a unique business workspace. Try again.", 409) from error

    if membership is None:
        raise RuntimeError("Business creation did not create an owner membership.")
    return jsonify(business_to_dict(business, membership.role)), 201
