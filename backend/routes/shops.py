from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func

from models import Business, BusinessMembership, Customer, CustomerAccount, Order, Product, db
from schemas.validators import (
    ShopCheckoutSchema,
    ShopCustomerLoginSchema,
    ShopCustomerProfileSchema,
    ShopCustomerRegistrationSchema,
    StorefrontSettingsSchema,
    validate_payload,
)
from services.order_service import create_order
from utils.errors import ApiError
from utils.permissions import role_required
from utils.rate_limit import rate_limit
from utils.security import hash_password, verify_password
from utils.tenancy import require_business_session

shops_bp = Blueprint("shops", __name__)


@shops_bp.get("/<string:slug>")
def public_shop(slug):
    business = _find_storefront(slug)
    return jsonify(_shop_details(business))


@shops_bp.get("/<string:slug>/products")
def public_products(slug):
    business = _find_storefront(slug)
    products = (
        Product.query.filter(
            Product.business_id == business.id,
            Product.quantity > 0,
        )
        .order_by(Product.name)
        .all()
    )
    return jsonify([
        {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "price": float(product.price),
            "inStock": product.quantity > 0,
        }
        for product in products
    ])


@shops_bp.post("/<string:slug>/customer/register")
@rate_limit(max_requests=5, window_seconds=3600)
def register_shop_customer(slug):
    business = _find_storefront(slug)
    data = validate_payload(ShopCustomerRegistrationSchema, request.get_json())
    account = CustomerAccount.query.filter(
        func.lower(CustomerAccount.email) == data["email"].lower()
    ).first()

    customer = (
        Customer.query.filter(
            Customer.business_id == business.id,
            func.lower(Customer.email) == data["email"].lower(),
        )
        .order_by(Customer.id)
        .first()
    )
    if customer:
        if account:
            if not account.is_active or not verify_password(data["password"], account.password_hash):
                raise ApiError("Invalid shop, email, or password", 401)
        elif not customer.portal_password_hash or not verify_password(data["password"], customer.portal_password_hash):
            raise ApiError(
                "This shop already has a customer record for that email. Ask the shop owner to activate customer access.",
                409,
            )
        if customer.customer_account_id is not None:
            raise ApiError("This customer record is already linked to an account.", 409)

    if not account:
        account = CustomerAccount(
            name=data["name"],
            email=data["email"].lower(),
            password_hash=hash_password(data["password"]),
        )
        db.session.add(account)
        db.session.flush()
    if customer:
        customer.customer_account_id = account.id
        customer.name = data["name"]
        customer.phone = data["phone"]
        customer.address = data["address"]
        customer.portal_requires_password_reset = False
    else:
        customer = Customer(
            business_id=business.id,
            customer_account_id=account.id,
            name=data["name"],
            email=account.email,
            phone=data["phone"],
            address=data["address"],
        )
        db.session.add(customer)
    db.session.commit()
    return jsonify({
        "accessToken": _shop_customer_token(account),
        "shop": _shop_details(business),
        "customer": _customer_profile_to_dict(customer),
    }), 201


@shops_bp.post("/<string:slug>/customer/login")
@rate_limit(max_requests=5, window_seconds=900)
def login_shop_customer(slug):
    business = _find_storefront(slug)
    data = validate_payload(ShopCustomerLoginSchema, request.get_json())
    account = CustomerAccount.query.filter(
        func.lower(CustomerAccount.email) == data["email"].lower()
    ).first()

    if account:
        valid_password = account.is_active and verify_password(data["password"], account.password_hash)
        if not valid_password:
            raise ApiError("Invalid shop, email, or password", 401)
        if valid_password:
            legacy_profile = (
                Customer.query.filter(
                    Customer.business_id == business.id,
                    Customer.customer_account_id.is_(None),
                    func.lower(Customer.email) == account.email.lower(),
                )
                .order_by(Customer.id)
                .first()
            )
            if legacy_profile:
                legacy_profile.customer_account_id = account.id
                legacy_profile.portal_requires_password_reset = False
                db.session.commit()
    else:
        customer = (
            Customer.query.filter(
                Customer.business_id == business.id,
                func.lower(Customer.email) == data["email"].lower(),
            )
            .order_by(Customer.id)
            .first()
        )
        if not customer or not customer.portal_password_hash or not verify_password(
            data["password"], customer.portal_password_hash
        ):
            raise ApiError("Invalid shop, email, or password", 401)
        account = CustomerAccount(
            name=customer.name,
            email=customer.email.lower(),
            password_hash=hash_password(data["password"]),
        )
        db.session.add(account)
        db.session.flush()
        customer.customer_account_id = account.id
        customer.portal_requires_password_reset = False
        db.session.commit()

    return jsonify({
        "accessToken": _shop_customer_token(account),
        "shop": _shop_details(business),
        "customer": _customer_profile_to_dict(_find_account_profile(account, business)),
    })


@shops_bp.get("/<string:slug>/customer/me")
@jwt_required()
def shop_customer_me(slug):
    business = _find_storefront(slug)
    account = _get_shop_customer_account()
    customer = _find_account_profile(account, business)
    return jsonify({
        "account": {"name": account.name, "email": account.email},
        "customer": _customer_profile_to_dict(customer) if customer else None,
        "shop": _shop_details(business),
    })


@shops_bp.put("/<string:slug>/customer/me")
@jwt_required()
def update_shop_customer_me(slug):
    business = _find_storefront(slug)
    account = _get_shop_customer_account()
    data = validate_payload(ShopCustomerProfileSchema, request.get_json())
    customer = _find_account_profile(account, business)
    if customer is None:
        customer = Customer(
            business_id=business.id,
            customer_account_id=account.id,
            email=account.email,
            **data,
        )
        db.session.add(customer)
    else:
        customer.name = data["name"]
        customer.phone = data["phone"]
        customer.address = data["address"]
    account.name = data["name"]
    db.session.commit()
    return jsonify(_customer_profile_to_dict(customer))


@shops_bp.put("/<string:slug>/customer/password")
@jwt_required()
def update_shop_customer_password(slug):
    _find_storefront(slug)
    account = _get_shop_customer_account()
    data = request.get_json() or {}
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")
    if not isinstance(current_password, str) or not isinstance(new_password, str):
        raise ApiError("Current and new passwords are required", 422)
    if len(new_password) < 8 or len(new_password) > 128:
        raise ApiError("New password must contain 8 to 128 characters", 422)
    if not verify_password(current_password, account.password_hash):
        raise ApiError("Current password is incorrect", 401)
    account.password_hash = hash_password(new_password)
    db.session.commit()
    return jsonify({"message": "Customer account password updated"})


@shops_bp.get("/<string:slug>/customer/orders")
@jwt_required()
def shop_customer_orders(slug):
    business = _find_storefront(slug)
    account = _get_shop_customer_account()
    customer = _find_account_profile(account, business)
    if not customer:
        return jsonify([])
    orders = (
        Order.query.filter_by(business_id=business.id, customer_id=customer.id)
        .order_by(Order.date.desc(), Order.id.desc())
        .all()
    )
    return jsonify([_shop_order_to_dict(order) for order in orders])


@shops_bp.get("/<string:slug>/customer/orders/<int:order_id>")
@jwt_required()
def shop_customer_order_detail(slug, order_id):
    business = _find_storefront(slug)
    account = _get_shop_customer_account()
    customer = _find_account_profile(account, business)
    order = (
        Order.query.filter_by(
            id=order_id,
            business_id=business.id,
            customer_id=customer.id if customer else -1,
        )
        .first()
    )
    if not order:
        raise ApiError("Order not found", 404)
    return jsonify(_shop_order_to_dict(order))


@shops_bp.post("/<string:slug>/customer/orders")
@jwt_required()
def place_shop_order(slug):
    business = _find_storefront(slug)
    account = _get_shop_customer_account()
    customer = _find_account_profile(account, business)
    if not customer:
        raise ApiError("Complete your shop profile before checkout", 409)
    data = validate_payload(ShopCheckoutSchema, request.get_json())
    order = create_order({
        "customer_id": customer.id,
        "items": [
            {"product_id": item["product_id"], "quantity": item["quantity"], "discount": 0}
            for item in data["items"]
        ],
    })
    order.fulfillment_type = data["fulfillment_type"]
    order.delivery_address = data["delivery_address"].strip() if data["fulfillment_type"] == "delivery" else ""
    db.session.commit()
    return jsonify(_shop_order_to_dict(order)), 201


@shops_bp.get("/<string:slug>/owner")
@jwt_required()
@require_business_session
def resolve_owner_shop(slug):
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError) as error:
        raise ApiError("Business account authentication required", 403) from error
    membership = (
        BusinessMembership.query.join(Business)
        .filter(
            Business.slug == slug,
            BusinessMembership.user_id == user_id,
            BusinessMembership.status == "active",
            Business.status == "active",
        )
        .first()
    )
    if not membership:
        raise ApiError("Shop workspace not found or you do not have access", 404)
    return jsonify({
        "id": membership.business.id,
        "name": membership.business.name,
        "slug": membership.business.slug,
        "businessType": membership.business.business_type,
        "status": membership.business.status,
        "role": membership.role,
    })


@shops_bp.get("/<string:slug>/storefront/settings")
@jwt_required()
@require_business_session
def read_storefront_settings(slug):
    business = _business_for_active_owner(slug)
    return jsonify(_storefront_settings_to_dict(business))


@shops_bp.put("/<string:slug>/storefront/settings")
@role_required("admin")
def update_storefront_settings(slug):
    business = Business.query.filter_by(id=g.business_id, slug=slug).first()
    if not business:
        raise ApiError("Shop workspace not found", 404)
    data = validate_payload(StorefrontSettingsSchema, request.get_json())
    for key, value in data.items():
        setattr(business, key, value)
    db.session.commit()
    return jsonify(_storefront_settings_to_dict(business))


def _find_storefront(slug):
    business = Business.query.filter_by(slug=slug, status="active").first()
    if not business or not business.storefront_enabled:
        raise ApiError("Shop storefront is unavailable", 404)
    return business


def _shop_details(business):
    return {
        "name": business.name,
        "slug": business.slug,
        "businessType": business.business_type,
        "description": business.storefront_description,
        "logoUrl": business.storefront_logo_url,
        "brandColor": business.storefront_brand_color,
        "contactEmail": business.storefront_contact_email,
        "contactPhone": business.storefront_contact_phone,
        "address": business.storefront_address,
    }


def _storefront_settings_to_dict(business):
    return {
        "storefrontEnabled": business.storefront_enabled,
        "storefrontDescription": business.storefront_description,
        "storefrontLogoUrl": business.storefront_logo_url,
        "storefrontBrandColor": business.storefront_brand_color,
        "storefrontContactEmail": business.storefront_contact_email,
        "storefrontContactPhone": business.storefront_contact_phone,
        "storefrontAddress": business.storefront_address,
    }


def _shop_customer_token(account):
    return create_access_token(
        identity=str(account.id),
        additional_claims={
            "portal": "customer",
            "session_type": "customer_portal",
            "shop_customer_account": True,
        },
    )


def _get_shop_customer_account():
    claims = get_jwt()
    if claims.get("portal") != "customer" or not claims.get("shop_customer_account"):
        raise ApiError("Shop customer authentication required", 403)
    try:
        account_id = int(get_jwt_identity())
    except (TypeError, ValueError) as error:
        raise ApiError("Invalid shop customer token", 401) from error
    account = db.session.get(CustomerAccount, account_id)
    if not account or not account.is_active:
        raise ApiError("Customer account is unavailable", 403)
    return account


def _find_account_profile(account, business):
    return Customer.query.filter_by(
        business_id=business.id,
        customer_account_id=account.id,
    ).first()


def _customer_profile_to_dict(customer):
    if not customer:
        return None
    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
    }


def _shop_order_to_dict(order):
    return {
        "id": order.id,
        "orderNumber": order.order_number,
        "date": order.date.isoformat(),
        "status": order.status,
        "fulfillmentType": order.fulfillment_type,
        "deliveryAddress": order.delivery_address,
        "totalQuantity": order.total_quantity,
        "totalPrice": float(order.total_price),
        "items": [
            {
                "productName": item.product_name,
                "quantity": item.quantity,
                "unitPrice": float(item.unit_price),
                "totalPrice": float(item.total_price),
            }
            for item in order.items
        ],
    }


def _business_for_active_owner(slug):
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError) as error:
        raise ApiError("Business account authentication required", 403) from error
    membership = (
        BusinessMembership.query.join(Business)
        .filter(
            Business.slug == slug,
            BusinessMembership.user_id == user_id,
            BusinessMembership.status == "active",
            Business.status == "active",
        )
        .first()
    )
    if not membership:
        raise ApiError("Shop workspace not found or you do not have access", 404)
    return membership.business
