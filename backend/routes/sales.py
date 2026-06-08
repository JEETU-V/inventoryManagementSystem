from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from models import Sale
from services.report_service import sales_summary
from services.serializers import sale_to_dict

sales_bp = Blueprint("sales", __name__)


@sales_bp.get("")
@jwt_required()
def list_sales():
    sales = Sale.query.order_by(Sale.date.desc(), Sale.id.desc()).all()
    return jsonify([sale_to_dict(sale) for sale in sales])


@sales_bp.get("/summary")
@jwt_required()
def summary():
    return jsonify(sales_summary())

