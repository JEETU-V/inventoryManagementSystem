from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import Order, db
from schemas.validators import OrderSchema, OrderStatusSchema, validate_payload
from services.order_service import create_order, update_order_status
from services.serializers import order_to_dict
from utils.errors import ApiError

orders_bp = Blueprint("orders", __name__)


@orders_bp.get("")
@jwt_required()
def list_orders():
    orders = Order.query.order_by(Order.date.desc(), Order.id.desc()).all()
    return jsonify([order_to_dict(order) for order in orders])


@orders_bp.post("")
@jwt_required()
def add_order():
    data = validate_payload(OrderSchema, request.get_json())
    order = create_order(data)
    db.session.commit()
    return jsonify(order_to_dict(order)), 201


@orders_bp.put("/<int:order_id>")
@jwt_required()
def update_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        raise ApiError("Order not found", 404)
    data = validate_payload(OrderStatusSchema, request.get_json(), partial=True)
    if "status" in data:
        update_order_status(order, data["status"])
    db.session.commit()
    return jsonify(order_to_dict(order))


@orders_bp.post("/<int:order_id>/cancel")
@jwt_required()
def cancel_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        raise ApiError("Order not found", 404)
    update_order_status(order, "Cancelled")
    db.session.commit()
    return jsonify(order_to_dict(order))

