from flask import Blueprint, jsonify
from services.report_service import sales_summary
from utils.tenancy import business_required

sales_bp = Blueprint("sales", __name__)


@sales_bp.get("/summary")
@business_required
def summary():
    return jsonify(sales_summary())
