from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from secrets import token_urlsafe
from sqlalchemy import or_

from models import Business, Customer, Order, db
from schemas.validators import (
    CustomerPortalLoginSchema,
    CustomerPortalPasswordSchema,
    CustomerPortalRegistrationSchema,
    CustomerSchema,
    validate_payload,
)
from services.serializers import customer_to_dict, order_to_dict
from utils.errors import ApiError
from utils.permissions import role_required
from utils.security import hash_password, verify_password
from utils.tenancy import business_required

customers_bp = Blueprint("customers", __name__)


def _portal_token(customer):
    return create_access_token(
        identity=str(customer.id),
        additional_claims={
            "portal": "customer",
            "session_type": "customer_portal",
            "business_id": customer.business_id,
        },
    )


@customers_bp.post("/portal/register")
def register_customer_portal():
    data = validate_payload(CustomerPortalRegistrationSchema, request.get_json())
    business = Business.query.filter_by(slug=data["business_slug"], status="active").first()
    if not business:
        raise ApiError("Unable to create a customer account for this business", 404)

    matches = Customer.query.filter(
        Customer.business_id == business.id,
        db.func.lower(Customer.email) == data["email"],
    ).order_by(Customer.id).all()
    if matches:
        raise ApiError(
            "This email already has a customer record. Contact the business to activate portal access.",
            409,
        )

    customer = Customer(
        business_id=business.id,
        name=data["name"],
        email=data["email"],
        phone=data["phone"],
        address=data["address"],
    )
    customer.portal_password_hash = hash_password(data["password"])
    db.session.add(customer)
    db.session.commit()
    return jsonify({
        "accessToken": _portal_token(customer),
        "customer": customer_to_dict(customer),
        "business": {"name": business.name, "slug": business.slug},
    }), 201


@customers_bp.post("/portal/login")
def login_customer_portal():
    data = validate_payload(CustomerPortalLoginSchema, request.get_json())
    business = Business.query.filter_by(slug=data["business_slug"], status="active").first()
    customer = None
    if business:
        customer = Customer.query.filter(
            Customer.business_id == business.id,
            db.func.lower(Customer.email) == data["email"],
        ).first()
    if (
        not customer
        or not customer.portal_password_hash
        or not verify_password(data["password"], customer.portal_password_hash)
    ):
        raise ApiError("Invalid business, email, or password", 401)

    return jsonify({
        "accessToken": _portal_token(customer),
        "customer": customer_to_dict(customer),
        "business": {"name": business.name, "slug": business.slug},
    })


@customers_bp.get("/portal/dashboard")
@jwt_required()
def customer_portal_dashboard():
    claims = get_jwt()
    if claims.get("portal") != "customer":
        raise ApiError("Customer portal authentication required", 403)
    try:
        business_id = int(claims["business_id"])
        customer_id = int(get_jwt_identity())
    except (KeyError, TypeError, ValueError) as error:
        raise ApiError("Invalid customer portal token", 401) from error

    customer = Customer.query.filter_by(
        id=customer_id,
        business_id=business_id,
    ).first()
    if (
        not customer
        or not customer.portal_password_hash
        or customer.business.status != "active"
    ):
        raise ApiError("Customer account not found", 404)

    orders = Order.query.filter_by(
        customer_id=customer.id,
        business_id=business_id,
    ).order_by(Order.date.desc(), Order.id.desc()).all()
    return jsonify({
        "customer": customer_to_dict(customer),
        "business": {"name": customer.business.name, "slug": customer.business.slug},
        "orders": [order_to_dict(order) for order in orders],
        "orderCount": len(orders),
        "activeOrderCount": sum(order.status not in ("Completed", "Cancelled") for order in orders),
        "mustChangePassword": customer.portal_requires_password_reset,
    })


@customers_bp.post("/portal/password")
@jwt_required()
def change_customer_portal_password():
    claims = get_jwt()
    if claims.get("portal") != "customer":
        raise ApiError("Customer portal authentication required", 403)
    try:
        business_id = int(claims["business_id"])
        customer_id = int(get_jwt_identity())
    except (KeyError, TypeError, ValueError) as error:
        raise ApiError("Invalid customer portal token", 401) from error

    customer = Customer.query.filter_by(
        id=customer_id,
        business_id=business_id,
    ).first()
    data = validate_payload(CustomerPortalPasswordSchema, request.get_json())
    if (
        not customer
        or not customer.portal_password_hash
        or not verify_password(data["current_password"], customer.portal_password_hash)
    ):
        raise ApiError("Current password is incorrect", 401)

    customer.portal_password_hash = hash_password(data["new_password"])
    customer.portal_requires_password_reset = False
    db.session.commit()
    return jsonify({"message": "Customer portal password updated"})


@customers_bp.post("/<int:customer_id>/portal-access")
@role_required("admin")
def create_customer_portal_access(customer_id):
    customer = Customer.query.filter_by(id=customer_id).first()
    if not customer:
        raise ApiError("Customer not found", 404)
    if customer.portal_password_hash:
        raise ApiError("Customer portal access is already active", 409)

    temporary_password = token_urlsafe(18)
    customer.portal_password_hash = hash_password(temporary_password)
    customer.portal_requires_password_reset = True
    db.session.commit()
    return jsonify({
        "customer": customer_to_dict(customer),
        "temporaryPassword": temporary_password,
    }), 201


@customers_bp.get("")
@business_required
def list_customers():
    query = request.args.get("q", "").strip()
    customers = Customer.query
    if query:
        like = f"%{query}%"
        customers = customers.filter(
            or_(Customer.name.ilike(like), Customer.phone.ilike(like), Customer.email.ilike(like))
        )
    return jsonify([customer_to_dict(customer) for customer in customers.order_by(Customer.name).all()])


@customers_bp.get("/<int:customer_id>")
@business_required
def get_customer(customer_id):
    customer = Customer.query.filter_by(id=customer_id).first()
    if not customer:
        raise ApiError("Customer not found", 404)
    return jsonify(customer_to_dict(customer))


@customers_bp.post("")
@role_required("admin", "staff")
def create_customer():
    data = validate_payload(CustomerSchema, request.get_json())
    customer = Customer(**data)
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer_to_dict(customer)), 201


@customers_bp.put("/<int:customer_id>")
@role_required("admin", "staff")
def update_customer(customer_id):
    customer = Customer.query.filter_by(id=customer_id).first()
    if not customer:
        raise ApiError("Customer not found", 404)
    data = validate_payload(CustomerSchema, request.get_json(), partial=True)
    for field, value in data.items():
        setattr(customer, field, value)
    db.session.commit()
    return jsonify(customer_to_dict(customer))


@customers_bp.delete("/<int:customer_id>")
@role_required("admin")
def delete_customer(customer_id):
    customer = Customer.query.filter_by(id=customer_id).first()
    if not customer:
        raise ApiError("Customer not found", 404)

    order_count = Order.query.filter_by(customer_id=customer_id).count()
    if order_count:
        raise ApiError(
            f"Cannot delete customer with {order_count} existing order(s). Cancel or reassign orders first.",
            409,
        )

    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "Customer deleted"})


@customers_bp.get("/<int:customer_id>/orders")
@business_required
def customer_orders(customer_id):
    customer = Customer.query.filter_by(id=customer_id).first()
    if not customer:
        raise ApiError("Customer not found", 404)
    return jsonify([order_to_dict(order) for order in customer.orders])
