from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from services.report_service import dashboard_summary

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/summary")
@jwt_required()
def summary():
    return jsonify(dashboard_summary())

