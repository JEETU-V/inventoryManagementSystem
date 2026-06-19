from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from models import InventoryTransaction, Order, Product, db
from schemas.validators import InventoryTransactionSchema, validate_payload
from services.inventory_service import adjust_stock
from services.serializers import inventory_transaction_to_dict, product_to_dict
from utils.errors import ApiError

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.get("")
@jwt_required()
def inventory_summary():
    products = Product.query.order_by(Product.name).all()
    low_stock = [product for product in products if product.quantity <= product.reorder_level]
    out_of_stock = [product for product in products if product.quantity == 0]
    pending_orders = Order.query.filter(Order.status == "Pending").count()
    category_totals = (
        db.session.query(Product.category, func.sum(Product.quantity))
        .group_by(Product.category)
        .all()
    )

    return jsonify({
        "totalProducts": len(products),
        "lowStockCount": len(low_stock),
        "outOfStockCount": len(out_of_stock),
        "pendingOrders": pending_orders,
        "products": [product_to_dict(product) for product in products],
        "lowStockProducts": [product_to_dict(product) for product in low_stock],
        "categoryStock": [
            {"category": category or "Uncategorized", "quantity": int(total or 0)}
            for category, total in category_totals
        ],
    })


@inventory_bp.get("/transactions")
@jwt_required()
def list_inventory_transactions():
    product_id = request.args.get("productId", type=int)
    transactions = InventoryTransaction.query
    if product_id:
        transactions = transactions.filter_by(product_id=product_id)
    transactions = transactions.order_by(InventoryTransaction.created_at.desc()).all()
    return jsonify([inventory_transaction_to_dict(transaction) for transaction in transactions])


@inventory_bp.post("/transactions")
@jwt_required()
def create_inventory_transaction():
    data = validate_payload(InventoryTransactionSchema, request.get_json())
    product = Product.query.get(data["product_id"])
    if not product:
        raise ApiError("Product not found", 404)
    adjust_stock(product, data["transaction_type"], data["quantity"], data.get("reason", "Manual adjustment"))
    db.session.commit()
    return jsonify(product_to_dict(product)), 201
