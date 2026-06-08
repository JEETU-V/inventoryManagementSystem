from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from services.report_service import profit_summary
from utils.permissions import role_required

profit_bp = Blueprint("profit", __name__)


@profit_bp.get("/summary")
@role_required("admin")
def summary():
    return jsonify(profit_summary())


@profit_bp.get("/reports")
@jwt_required()
def reports():
    return jsonify(profit_summary())

