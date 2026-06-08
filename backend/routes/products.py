from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from models import Category, Product, db
from schemas.validators import ProductSchema, validate_payload
from services.serializers import product_to_dict
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
    products = Product.query
    if query:
        like = f"%{query}%"
        products = products.filter(or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like)))
    if category:
        products = products.filter(Product.category == category)
    return jsonify([product_to_dict(product) for product in products.order_by(Product.name).all()])


@products_bp.post("")
@role_required("admin")
def create_product():
    data = validate_payload(ProductSchema, request.get_json())
    category = sync_category(data.get("category"))
    product = Product(
        supplier_id=data.get("supplier_id"),
        category_id=category.id if category else None,
        name=data["name"],
        sku=data["sku"],
        category=data.get("category", ""),
        purchase_price=data["purchase_price"],
        quantity=data["quantity"],
        price=data["price"],
        reorder_level=data["reorder_level"],
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product_to_dict(product)), 201


@products_bp.put("/<int:product_id>")
@role_required("admin")
def update_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        raise ApiError("Product not found", 404)
    data = validate_payload(ProductSchema, request.get_json(), partial=True)
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
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"})

