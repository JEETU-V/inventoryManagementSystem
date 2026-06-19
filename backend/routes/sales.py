from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from services.report_service import sales_summary

sales_bp = Blueprint("sales", __name__)


@sales_bp.get("/summary")
@jwt_required()
def summary():
    return jsonify(sales_summary())
