from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError

from models import (
    Business,
    BusinessMembership,
    PlatformAuditEvent,
    PlatformSupportCase,
    SubscriptionPlan,
    User,
    db,
)
from schemas.validators import (
    BusinessPlanAssignmentSchema,
    PlatformBusinessStatusSchema,
    PlatformOwnerStatusSchema,
    PlatformSupportCaseSchema,
    PlatformSupportCaseStatusSchema,
    SubscriptionPlanSchema,
    validate_payload,
)
from utils.errors import ApiError
from utils.platform_admin import is_platform_admin, platform_admin_required

platform_admin_bp = Blueprint("platform_admin", __name__)


@platform_admin_bp.get("/summary")
@platform_admin_required
def summary():
    return jsonify({
        "metrics": _platform_metrics(),
        "businesses": _business_overview(),
    })


@platform_admin_bp.get("/businesses")
@platform_admin_required
def list_businesses():
    return jsonify(_business_overview())


@platform_admin_bp.put("/businesses/<int:business_id>/status")
@platform_admin_required
def update_business_status(business_id):
    business = db.session.get(Business, business_id)
    if not business:
        raise ApiError("Business not found", 404)
    data = validate_payload(PlatformBusinessStatusSchema, request.get_json())
    old_status = business.status
    business.status = data["status"]
    _record_audit(
        "business.status_changed",
        f"Changed workspace {business.name} status from {old_status} to {business.status}",
        business.id,
    )
    db.session.commit()
    return jsonify(_business_to_dict(business))


@platform_admin_bp.get("/owners")
@platform_admin_required
def list_owners():
    owner_memberships = (
        db.session.query(
            BusinessMembership.user_id.label("user_id"),
            func.count(BusinessMembership.id).label("business_count"),
        )
        .filter(BusinessMembership.role == "owner")
        .group_by(BusinessMembership.user_id)
        .subquery()
    )
    rows = (
        db.session.query(User, owner_memberships.c.business_count)
        .join(owner_memberships, owner_memberships.c.user_id == User.id)
        .order_by(User.created_at.desc(), User.id.desc())
        .limit(200)
        .all()
    )
    return jsonify([
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "isActive": user.is_active,
            "businessCount": business_count,
            "createdAt": user.created_at.isoformat(),
            "isPlatformAdmin": is_platform_admin(user),
        }
        for user, business_count in rows
    ])


@platform_admin_bp.put("/owners/<int:user_id>/status")
@platform_admin_required
def update_owner_status(user_id):
    owner = db.session.get(User, user_id)
    if not owner:
        raise ApiError("Owner account not found", 404)
    if is_platform_admin(owner):
        raise ApiError("Platform administrator accounts cannot be changed here", 403)
    if str(user_id) == str(get_jwt_identity()):
        raise ApiError("You cannot change your own account status", 403)
    data = validate_payload(PlatformOwnerStatusSchema, request.get_json())
    owner.is_active = data["is_active"]
    _record_audit(
        "owner.status_changed",
        f"{'Activated' if owner.is_active else 'Suspended'} owner account {owner.email}",
    )
    db.session.commit()
    return jsonify({
        "id": owner.id,
        "name": owner.name,
        "email": owner.email,
        "isActive": owner.is_active,
    })


@platform_admin_bp.get("/plans")
@platform_admin_required
def list_subscription_plans():
    return jsonify([_plan_to_dict(plan) for plan in SubscriptionPlan.query.order_by(SubscriptionPlan.name).all()])


@platform_admin_bp.post("/plans")
@platform_admin_required
def create_subscription_plan():
    data = validate_payload(SubscriptionPlanSchema, request.get_json())
    if SubscriptionPlan.query.filter(func.lower(SubscriptionPlan.name) == data["name"].lower()).first():
        raise ApiError("A subscription plan with this name already exists", 409)
    plan = SubscriptionPlan(**data)
    db.session.add(plan)
    db.session.flush()
    _record_audit("subscription_plan.created", f"Created subscription plan {plan.name}")
    db.session.commit()
    return jsonify(_plan_to_dict(plan)), 201


@platform_admin_bp.put("/plans/<int:plan_id>")
@platform_admin_required
def update_subscription_plan(plan_id):
    plan = db.session.get(SubscriptionPlan, plan_id)
    if not plan:
        raise ApiError("Subscription plan not found", 404)
    data = validate_payload(SubscriptionPlanSchema, request.get_json())
    duplicate = SubscriptionPlan.query.filter(
        func.lower(SubscriptionPlan.name) == data["name"].lower(),
        SubscriptionPlan.id != plan.id,
    ).first()
    if duplicate:
        raise ApiError("A subscription plan with this name already exists", 409)
    plan.name = data["name"]
    plan.description = data["description"]
    plan.monthly_price = data["monthly_price"]
    plan.annual_price = data["annual_price"]
    plan.is_active = data["is_active"]
    _record_audit("subscription_plan.updated", f"Updated subscription plan {plan.name}")
    db.session.commit()
    return jsonify(_plan_to_dict(plan))


@platform_admin_bp.put("/businesses/<int:business_id>/plan")
@platform_admin_required
def assign_business_plan(business_id):
    business = db.session.get(Business, business_id)
    if not business:
        raise ApiError("Business not found", 404)
    data = validate_payload(BusinessPlanAssignmentSchema, request.get_json())
    plan = db.session.get(SubscriptionPlan, data["plan_id"]) if data["plan_id"] else None
    if data["plan_id"] and not plan:
        raise ApiError("Subscription plan not found", 404)
    if plan and not plan.is_active:
        raise ApiError("An inactive subscription plan cannot be assigned", 422)
    old_plan = business.subscription_plan.name if business.subscription_plan else "no plan"
    business.subscription_plan = plan
    new_plan = plan.name if plan else "no plan"
    _record_audit(
        "business.plan_assigned",
        f"Changed workspace {business.name} plan from {old_plan} to {new_plan}",
        business.id,
    )
    db.session.commit()
    return jsonify(_business_to_dict(business))


@platform_admin_bp.get("/support-cases")
@platform_admin_required
def list_support_cases():
    cases = (
        PlatformSupportCase.query.order_by(
            PlatformSupportCase.updated_at.desc(),
            PlatformSupportCase.id.desc(),
        )
        .limit(200)
        .all()
    )
    return jsonify([_support_case_to_dict(case) for case in cases])


@platform_admin_bp.post("/support-cases")
@platform_admin_required
def create_support_case():
    data = validate_payload(PlatformSupportCaseSchema, request.get_json())
    if data["business_id"] and not db.session.get(Business, data["business_id"]):
        raise ApiError("Business not found", 404)
    case = PlatformSupportCase(
        **data,
        created_by_id=int(get_jwt_identity()),
    )
    db.session.add(case)
    db.session.flush()
    _record_audit("support_case.created", f"Created support case #{case.id}", case.business_id)
    db.session.commit()
    return jsonify(_support_case_to_dict(case)), 201


@platform_admin_bp.put("/support-cases/<int:case_id>/status")
@platform_admin_required
def update_support_case_status(case_id):
    case = db.session.get(PlatformSupportCase, case_id)
    if not case:
        raise ApiError("Support case not found", 404)
    data = validate_payload(PlatformSupportCaseStatusSchema, request.get_json())
    previous_status = case.status
    case.status = data["status"]
    _record_audit(
        "support_case.status_changed",
        f"Changed support case #{case.id} from {previous_status} to {case.status}",
        case.business_id,
    )
    db.session.commit()
    return jsonify(_support_case_to_dict(case))


@platform_admin_bp.get("/audit-logs")
@platform_admin_required
def list_audit_logs():
    events = PlatformAuditEvent.query.order_by(
        PlatformAuditEvent.created_at.desc(),
        PlatformAuditEvent.id.desc(),
    ).limit(200).all()
    return jsonify([
        {
            "id": event.id,
            "actorName": event.actor.name,
            "actorEmail": event.actor.email,
            "action": event.action,
            "summary": event.summary,
            "businessName": event.business.name if event.business else None,
            "createdAt": event.created_at.isoformat(),
        }
        for event in events
    ])


@platform_admin_bp.get("/health")
@platform_admin_required
def platform_health():
    try:
        db.session.execute(text("SELECT 1"))
        database_status = "connected"
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("Platform administrator health check failed")
        database_status = "unavailable"
    return jsonify({
        "status": "ok" if database_status == "connected" else "degraded",
        "database": database_status,
        "checkedAt": datetime.utcnow().isoformat(),
    }), 200 if database_status == "connected" else 503


def _platform_metrics():
    active_businesses = Business.query.filter_by(status="active").count()
    suspended_businesses = Business.query.filter_by(status="suspended").count()
    owner_accounts = (
        db.session.query(func.count(func.distinct(BusinessMembership.user_id)))
        .filter(BusinessMembership.role == "owner")
        .scalar()
    )
    return {
        "businesses": Business.query.count(),
        "activeBusinesses": active_businesses,
        "suspendedBusinesses": suspended_businesses,
        "ownerAccounts": owner_accounts,
        "activeOwnerAccounts": (
            db.session.query(func.count(func.distinct(BusinessMembership.user_id)))
            .join(User, User.id == BusinessMembership.user_id)
            .filter(BusinessMembership.role == "owner", User.is_active.is_(True))
            .scalar()
        ),
        "activeMemberships": BusinessMembership.query.filter_by(status="active").count(),
    }


def _business_overview():
    rows = (
        db.session.query(
            Business,
            User.name.label("owner_name"),
            User.email.label("owner_email"),
            User.is_active.label("owner_is_active"),
            SubscriptionPlan.name.label("plan_name"),
        )
        .join(User, User.id == Business.created_by_id)
        .outerjoin(SubscriptionPlan, SubscriptionPlan.id == Business.subscription_plan_id)
        .order_by(Business.created_at.desc(), Business.id.desc())
        .limit(200)
        .all()
    )
    return [
        _business_to_dict(
            business,
            owner_name=owner_name,
            owner_email=owner_email,
            owner_is_active=owner_is_active,
            plan_name=plan_name,
        )
        for business, owner_name, owner_email, owner_is_active, plan_name in rows
    ]


def _business_to_dict(
    business,
    owner_name=None,
    owner_email=None,
    owner_is_active=None,
    plan_name=None,
):
    if owner_name is None:
        owner_name = business.created_by.name
    if owner_email is None:
        owner_email = business.created_by.email
    if owner_is_active is None:
        owner_is_active = business.created_by.is_active
    if plan_name is None and business.subscription_plan:
        plan_name = business.subscription_plan.name
    return {
        "id": business.id,
        "name": business.name,
        "slug": business.slug,
        "businessType": business.business_type,
        "status": business.status,
        "createdAt": business.created_at.isoformat(),
        "ownerName": owner_name,
        "ownerEmail": owner_email,
        "ownerIsActive": owner_is_active,
        "subscriptionPlanId": business.subscription_plan_id,
        "subscriptionPlan": plan_name,
    }


def _plan_to_dict(plan):
    return {
        "id": plan.id,
        "name": plan.name,
        "description": plan.description,
        "monthlyPrice": float(plan.monthly_price),
        "annualPrice": float(plan.annual_price),
        "isActive": plan.is_active,
        "assignedBusinesses": len(plan.businesses),
    }


def _support_case_to_dict(case):
    return {
        "id": case.id,
        "businessId": case.business_id,
        "businessName": case.business.name if case.business else None,
        "createdBy": case.created_by.name,
        "subject": case.subject,
        "description": case.description,
        "priority": case.priority,
        "status": case.status,
        "createdAt": case.created_at.isoformat(),
        "updatedAt": case.updated_at.isoformat(),
    }


def _record_audit(action, summary, business_id=None):
    db.session.add(PlatformAuditEvent(
        actor_id=int(get_jwt_identity()),
        action=action,
        summary=summary,
        business_id=business_id,
    ))
