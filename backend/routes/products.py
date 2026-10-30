from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, or_

from models import (
    Category,
    InventoryTransaction,
    OrderItem,
    Product,
    SaleItem,
    Supplier,
    SupplierPdfItem,
    SupplierTransaction,
    db,
)
from schemas.validators import ProductSchema, validate_payload
from services.serializers import product_to_dict
from services.inventory_service import adjust_stock
from utils.errors import ApiError
from utils.permissions import role_required

products_bp = Blueprint("products", __name__)


def sync_category(name):
    if not name:
        return None
    category = Category.query.filter_by(name=name).first()
    if not category:
        category = Category(name=name)
        db.session.add(category)
        db.session.flush()
    return category


@products_bp.get("")
@jwt_required()
def list_products():
    query = request.args.get("q", "").strip()
    category = request.args.get("category", "").strip()
    low_stock_only = request.args.get("lowStock", "").lower() in {"1", "true", "yes"}

    products = Product.query
    if query:
        like = f"%{query}%"
        products = products.filter(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like))
        )
    if category:
        products = products.filter(Product.category == category)
    if low_stock_only:
        products = products.filter(Product.quantity <= Product.reorder_level)

    return jsonify([product_to_dict(product) for product in products.order_by(Product.name).all()])


@products_bp.get("/low-stock")
@jwt_required()
def low_stock_products():
    products = Product.query.filter(Product.quantity <= Product.reorder_level).order_by(Product.quantity).all()
    return jsonify([product_to_dict(product) for product in products])


@products_bp.get("/<int:product_id>")
@jwt_required()
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        raise ApiError("Product not found", 404)
    return jsonify(product_to_dict(product))


@products_bp.post("")
@role_required("admin")
def create_product():
    data = validate_payload(ProductSchema, request.get_json())
    if Product.query.filter(func.lower(Product.sku) == data["sku"].lower()).first():
        raise ApiError("A product with this SKU already exists.", 409, {"sku": ["SKU must be unique."]})
    if data.get("supplier_id") and not Supplier.query.get(data["supplier_id"]):
        raise ApiError("Supplier not found.", 422, {"supplierId": ["Choose an existing supplier."]})

    category = sync_category(data.get("category"))
    product = Product(
        supplier_id=data.get("supplier_id"),
        category_id=category.id if category else None,
        name=data["name"],
        sku=data["sku"],
        category=data.get("category", ""),
        purchase_price=data["purchase_price"],
        quantity=0,
        price=data["price"],
        reorder_level=data["reorder_level"],
    )
    db.session.add(product)
    if data["quantity"] > 0:
        db.session.flush()
        adjust_stock(product, "stock_in", data["quantity"], "Opening stock")
    db.session.commit()
    return jsonify(product_to_dict(product)), 201


@products_bp.put("/<int:product_id>")
@role_required("admin")
def update_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        raise ApiError("Product not found", 404)
    data = validate_payload(ProductSchema, request.get_json(), partial=True)
    if "quantity" in data and data["quantity"] != product.quantity:
        raise ApiError(
            "Product quantity must be changed through Inventory so the stock movement is recorded.",
            422,
            {"quantity": ["Use the Inventory stock adjustment workflow."]},
        )
    if "sku" in data and Product.query.filter(
        func.lower(Product.sku) == data["sku"].lower(),
        Product.id != product_id,
    ).first():
        raise ApiError("A product with this SKU already exists.", 409, {"sku": ["SKU must be unique."]})
    if data.get("supplier_id") and not Supplier.query.get(data["supplier_id"]):
        raise ApiError("Supplier not found.", 422, {"supplierId": ["Choose an existing supplier."]})

    if "category" in data:
        category = sync_category(data.get("category"))
        product.category_id = category.id if category else None
    for field in ["supplier_id", "name", "sku", "category", "purchase_price", "quantity", "price", "reorder_level"]:
        if field in data:
            setattr(product, field, data[field])
    db.session.commit()
    return jsonify(product_to_dict(product))


@products_bp.delete("/<int:product_id>")
@role_required("admin")
def delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        raise ApiError("Product not found", 404)

    usage_counts = {
        "order": OrderItem.query.filter_by(product_id=product_id).count(),
        "sale": SaleItem.query.filter_by(product_id=product_id).count(),
        "inventory": InventoryTransaction.query.filter_by(product_id=product_id).count(),
        "purchase": SupplierTransaction.query.filter_by(product_id=product_id).count(),
        "supplier PDF": SupplierPdfItem.query.filter_by(product_id=product_id).count(),
    }
    references = [
        f"{count} {label} record(s)"
        for label, count in usage_counts.items()
        if count
    ]
    if references:
        raise ApiError(
            f"Cannot delete this product because it has linked {' and '.join(references)}. "
            "Keep the product record so its history remains accurate.",
            409,
        )

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"})
