from datetime import datetime
from decimal import Decimal

from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import jwt_required

from models import Order
from utils.errors import ApiError

bills_bp = Blueprint("bills", __name__)


def _company_info():
    return {
        "name": current_app.config["COMPANY_NAME"],
        "address": current_app.config["COMPANY_ADDRESS"],
        "phone": current_app.config["COMPANY_PHONE"],
        "email": current_app.config["COMPANY_EMAIL"],
        "gstNumber": current_app.config["COMPANY_GST_NUMBER"],
    }


def _build_bill(order):
    customer = order.customer
    bill_data = {
        "billNumber": order.order_number,
        "billDate": order.date.isoformat(),
        "billTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "customer": {
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address,
        },
        "items": [],
        "subtotal": 0,
        "tax": 0,
        "total": 0,
        "company": _company_info(),
    }

    subtotal = Decimal("0")
    for item in order.items:
        item_total = Decimal(str(item.total_price))
        subtotal += item_total
        bill_data["items"].append({
            "name": item.product_name,
            "quantity": item.quantity,
            "unitPrice": float(item.unit_price),
            "discount": float(item.discount),
            "total": float(item_total),
        })

    gst_rate = Decimal(str(current_app.config["GST_RATE"]))
    tax = subtotal * gst_rate
    total = subtotal + tax

    bill_data["subtotal"] = float(subtotal)
    bill_data["tax"] = float(tax)
    bill_data["total"] = float(total)
    return bill_data


@bills_bp.get("/<int:order_id>")
@jwt_required()
def get_bill(order_id):
    order = Order.query.get(order_id)
    if not order:
        raise ApiError("Order not found", 404)
    return jsonify(_build_bill(order))


@bills_bp.post("/print/<int:order_id>")
@jwt_required()
def print_bill(order_id):
    order = Order.query.get(order_id)
    if not order:
        raise ApiError("Order not found", 404)
    return jsonify({"success": True, "bill": _build_bill(order)})
