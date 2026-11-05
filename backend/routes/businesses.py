from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

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
    business = Business(
        name=data["name"],
        slug=make_business_slug(data["name"]),
        business_type=data["business_type"],
        created_by_id=user_id,
    )
    membership = BusinessMembership(user_id=user_id, business=business, role="owner")
    db.session.add_all([business, membership])
    db.session.commit()
    return jsonify(business_to_dict(business, membership.role)), 201
