from flask import Blueprint, jsonify
from services.report_service import dashboard_summary
from utils.tenancy import business_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/summary")
@business_required
def summary():
    return jsonify(dashboard_summary())
