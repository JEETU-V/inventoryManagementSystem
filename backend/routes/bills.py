from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from decimal import Decimal

from models import Order, OrderItem, Customer, Product, db
from services.serializers import order_to_dict
from utils.errors import ApiError

bills_bp = Blueprint("bills", __name__)


@bills_bp.get("/<int:order_id>")
def get_bill(order_id):
    """Get bill data for an order"""
    order = Order.query.get(order_id)
    if not order:
        raise ApiError("Order not found", 404)

    customer = order.customer
    bill_data = {
        "billNumber": order.order_number,
        "billDate": order.date.isoformat(),
        "billTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "customer": {
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone if hasattr(customer, "phone") else "",
            "address": customer.address if hasattr(customer, "address") else "",
        },
        "items": [],
        "subtotal": 0,
        "tax": 0,
        "total": 0,
        "company": {
            "name": "Stationery Shop",
            "address": "Your Shop Address",
            "phone": "Your Shop Phone",
            "email": "your@email.com",
            "gstNumber": "Your GST Number",
        },
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

    tax = subtotal * Decimal("0.18")  # 18% GST
    total = subtotal + tax

    bill_data["subtotal"] = float(subtotal)
    bill_data["tax"] = float(tax)
    bill_data["total"] = float(total)

    return jsonify(bill_data)


@bills_bp.post("/print/<int:order_id>")
def print_bill(order_id):
    """Generate printable bill (you can extend this to create PDF)"""
    bill_data = get_bill(order_id).get_json()
    return jsonify({"success": True, "bill": bill_data})
