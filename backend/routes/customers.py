from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from models import Customer, db
from schemas.validators import CustomerSchema, validate_payload
from services.serializers import customer_to_dict, order_to_dict
from utils.errors import ApiError

customers_bp = Blueprint("customers", __name__)


@customers_bp.get("")
@jwt_required()
def list_customers():
    query = request.args.get("q", "").strip()
    customers = Customer.query
    if query:
        like = f"%{query}%"
        customers = customers.filter(or_(Customer.name.ilike(like), Customer.phone.ilike(like), Customer.email.ilike(like)))
    return jsonify([customer_to_dict(customer) for customer in customers.order_by(Customer.name).all()])


@customers_bp.post("")
@jwt_required()
def create_customer():
    data = validate_payload(CustomerSchema, request.get_json())
    customer = Customer(**data)
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer_to_dict(customer)), 201


@customers_bp.put("/<int:customer_id>")
@jwt_required()
def update_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        raise ApiError("Customer not found", 404)
    data = validate_payload(CustomerSchema, request.get_json(), partial=True)
    for field, value in data.items():
        setattr(customer, field, value)
    db.session.commit()
    return jsonify(customer_to_dict(customer))


@customers_bp.delete("/<int:customer_id>")
@jwt_required()
def delete_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        raise ApiError("Customer not found", 404)
    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "Customer deleted"})


@customers_bp.get("/<int:customer_id>/orders")
@jwt_required()
def customer_orders(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        raise ApiError("Customer not found", 404)
    return jsonify([order_to_dict(order) for order in customer.orders])

