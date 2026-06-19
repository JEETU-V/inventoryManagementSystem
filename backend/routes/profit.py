from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from services.report_service import product_profit_breakdown, profit_summary
from utils.permissions import role_required

profit_bp = Blueprint("profit", __name__)


@profit_bp.get("/summary")
@role_required("admin")
def summary():
    return jsonify(profit_summary())


@profit_bp.get("/breakdown")
@role_required("admin")
def breakdown():
    return jsonify(product_profit_breakdown())


@profit_bp.get("/reports")
@role_required("admin")
def reports():
    return jsonify({
        "summary": profit_summary(),
        "breakdown": product_profit_breakdown(),
    })
