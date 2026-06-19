from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from models import Product, Supplier, SupplierTransaction, db
from schemas.validators import SupplierSchema, SupplierTransactionSchema, validate_payload
from services.inventory_service import adjust_stock
from services.serializers import supplier_to_dict, supplier_transaction_to_dict
from utils.errors import ApiError
from utils.permissions import role_required

suppliers_bp = Blueprint("suppliers", __name__)


@suppliers_bp.get("")
@jwt_required()
def list_suppliers():
    query = request.args.get("q", "").strip()
    suppliers = Supplier.query
    if query:
        like = f"%{query}%"
        suppliers = suppliers.filter(
            or_(Supplier.name.ilike(like), Supplier.contact.ilike(like), Supplier.email.ilike(like))
        )
    return jsonify([supplier_to_dict(supplier) for supplier in suppliers.order_by(Supplier.name).all()])


@suppliers_bp.get("/<int:supplier_id>")
@jwt_required()
def get_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        raise ApiError("Supplier not found", 404)
    return jsonify(supplier_to_dict(supplier))


@suppliers_bp.post("")
@role_required("admin")
def create_supplier():
    data = validate_payload(SupplierSchema, request.get_json())
    supplier = Supplier(**data)
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier_to_dict(supplier)), 201


@suppliers_bp.put("/<int:supplier_id>")
@role_required("admin")
def update_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        raise ApiError("Supplier not found", 404)
    data = validate_payload(SupplierSchema, request.get_json(), partial=True)
    for field, value in data.items():
        setattr(supplier, field, value)
    db.session.commit()
    return jsonify(supplier_to_dict(supplier))


@suppliers_bp.delete("/<int:supplier_id>")
@role_required("admin")
def delete_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        raise ApiError("Supplier not found", 404)

    product_count = Product.query.filter_by(supplier_id=supplier_id).count()
    if product_count:
        raise ApiError(
            f"Cannot delete supplier linked to {product_count} product(s). Reassign or remove products first.",
            409,
        )

    transaction_count = SupplierTransaction.query.filter_by(supplier_id=supplier_id).count()
    if transaction_count:
        raise ApiError(
            f"Cannot delete supplier with {transaction_count} purchase record(s).",
            409,
        )

    db.session.delete(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier deleted"})


@suppliers_bp.get("/transactions")
@jwt_required()
def list_transactions():
    supplier_id = request.args.get("supplierId", type=int)
    transactions = SupplierTransaction.query
    if supplier_id:
        transactions = transactions.filter_by(supplier_id=supplier_id)
    transactions = transactions.order_by(SupplierTransaction.date.desc()).all()
    return jsonify([supplier_transaction_to_dict(transaction) for transaction in transactions])


@suppliers_bp.post("/transactions")
@role_required("admin")
def create_transaction():
    data = validate_payload(SupplierTransactionSchema, request.get_json())
    product = Product.query.get(data["product_id"])
    if not product:
        raise ApiError("Product not found", 404)
    supplier = Supplier.query.get(data["supplier_id"])
    if not supplier:
        raise ApiError("Supplier not found", 404)

    transaction = SupplierTransaction(**data)
    db.session.add(transaction)
    adjust_stock(product, "stock_in", data["quantity"], "Supplier purchase")
    db.session.commit()
    return jsonify(supplier_transaction_to_dict(transaction)), 201
