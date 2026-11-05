from decimal import Decimal, InvalidOperation

from marshmallow import Schema, ValidationError, fields, pre_load, validates_schema, validate


def validate_payload(schema_cls, payload, partial=False):
    schema = schema_cls(partial=partial)
    try:
        return schema.load(payload or {})
    except ValidationError as error:
        from utils.errors import ApiError

        raise ApiError("Validation failed", 422, error.messages) from error


class ProductSchema(Schema):
    supplier_id = fields.Integer(allow_none=True, data_key="supplierId", validate=validate.Range(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1, max=160))
    sku = fields.String(required=True, validate=validate.Length(min=1, max=80))
    category = fields.String(load_default="", validate=validate.Length(max=120))
    purchase_price = fields.Decimal(
        required=True,
        as_string=False,
        places=2,
        validate=validate.Range(min=Decimal("0"), max=Decimal("9999999999.99")),
        data_key="purchasePrice",
    )
    quantity = fields.Integer(required=True, validate=validate.Range(min=0))
    price = fields.Decimal(
        required=True,
        as_string=False,
        places=2,
        validate=validate.Range(min=Decimal("0"), max=Decimal("9999999999.99")),
    )
    reorder_level = fields.Integer(required=True, validate=validate.Range(min=0), data_key="reorderLevel")

    @pre_load
    def trim_product_strings(self, data, **kwargs):
        data = dict(data or {})
        for key in ("name", "sku", "category"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        for key in ("purchasePrice", "price"):
            if key in data:
                try:
                    amount = Decimal(str(data[key]))
                except (InvalidOperation, ValueError):
                    continue
                if amount.is_finite() and amount.as_tuple().exponent < -2:
                    raise ValidationError({key: ["Use no more than 2 decimal places."]})
        return data


class SupplierSchema(Schema):
    name = fields.String(required=True)
    contact = fields.String(required=True)
    email = fields.Email(required=True)
    products_supplied = fields.String(required=True, data_key="productsSupplied")


class SupplierTransactionSchema(Schema):
    supplier_id = fields.Integer(required=True, data_key="supplierId")
    product_id = fields.Integer(required=True, data_key="productId")
    quantity = fields.Integer(required=True, validate=validate.Range(min=1))
    total_cost = fields.Decimal(
        required=True,
        as_string=False,
        places=2,
        validate=validate.Range(min=Decimal("0"), max=Decimal("9999999999.99")),
        data_key="totalCost",
    )
    date = fields.Date(required=True)

    @pre_load
    def validate_cost_precision(self, data, **kwargs):
        data = dict(data or {})
        if "totalCost" in data:
            try:
                amount = Decimal(str(data["totalCost"]))
            except (InvalidOperation, ValueError):
                return data
            if amount.is_finite() and amount.as_tuple().exponent < -2:
                raise ValidationError({"totalCost": ["Use no more than 2 decimal places."]})
        return data


class CustomerSchema(Schema):
    name = fields.String(required=True)
    phone = fields.String(required=True)
    email = fields.Email(required=True)
    address = fields.String(required=True)


class UserSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    password = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(min=8, max=128),
    )
    role = fields.String(
        required=True,
        validate=validate.OneOf(["admin", "staff", "viewer"]),
    )
    is_active = fields.Boolean(data_key="isActive")

    @pre_load
    def normalize_user_fields(self, data, **kwargs):
        data = dict(data or {})
        for key in ("name", "email"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        if isinstance(data.get("email"), str):
            data["email"] = data["email"].lower()
        return data


class OrderItemSchema(Schema):
    product_id = fields.Integer(required=True, data_key="productId")
    quantity = fields.Integer(required=True)
    discount = fields.Decimal(load_default=0, as_string=False)


class OrderSchema(Schema):
    customer_id = fields.Integer(required=True, data_key="customerId")
    items = fields.List(fields.Nested(OrderItemSchema), required=True)

    @validates_schema
    def validate_items(self, data, **kwargs):
        if not data.get("items"):
            raise ValidationError({"items": ["At least one order item is required."]})


class OrderStatusSchema(Schema):
    status = fields.String(required=True)


class InventoryTransactionSchema(Schema):
    product_id = fields.Integer(required=True, data_key="productId")
    transaction_type = fields.String(
        required=True,
        data_key="transactionType",
        validate=validate.OneOf(["stock_in", "stock_out"]),
    )
    quantity = fields.Integer(required=True, validate=validate.Range(min=1))
    reason = fields.String(required=True, validate=validate.Length(min=1, max=255))

    @pre_load
    def trim_reason(self, data, **kwargs):
        data = dict(data or {})
        if isinstance(data.get("reason"), str):
            data["reason"] = data["reason"].strip()
        return data


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)


class RegistrationSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    business_name = fields.String(
        required=True,
        data_key="businessName",
        validate=validate.Length(min=1, max=160),
    )
    business_type = fields.String(
        load_default="retail",
        data_key="businessType",
        validate=validate.OneOf(["retail", "wholesale", "both"]),
    )

    @pre_load
    def normalize_registration(self, data, **kwargs):
        data = dict(data or {})
        for key in ("name", "email", "businessName"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        if isinstance(data.get("email"), str):
            data["email"] = data["email"].lower()
        return data


class CustomerPortalRegistrationSchema(Schema):
    business_slug = fields.String(required=True, data_key="businessSlug", validate=validate.Length(min=1, max=120))
    name = fields.String(required=True, validate=validate.Length(min=1, max=160))
    email = fields.Email(required=True)
    phone = fields.String(required=True, validate=validate.Length(min=1, max=80))
    address = fields.String(load_default="", validate=validate.Length(max=500))
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))

    @pre_load
    def normalize_customer_registration(self, data, **kwargs):
        data = dict(data or {})
        for key in ("businessSlug", "name", "email", "phone", "address"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        if isinstance(data.get("businessSlug"), str):
            data["businessSlug"] = data["businessSlug"].lower()
        if isinstance(data.get("email"), str):
            data["email"] = data["email"].lower()
        return data


class CustomerPortalLoginSchema(Schema):
    business_slug = fields.String(required=True, data_key="businessSlug", validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    password = fields.String(required=True)

    @pre_load
    def normalize_customer_login(self, data, **kwargs):
        data = dict(data or {})
        for key in ("businessSlug", "email"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip().lower()
        return data


class CustomerPortalPasswordSchema(Schema):
    current_password = fields.String(required=True, data_key="currentPassword")
    new_password = fields.String(
        required=True,
        data_key="newPassword",
        validate=validate.Length(min=8, max=128),
    )


class BusinessSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=160))
    business_type = fields.String(
        load_default="retail",
        data_key="businessType",
        validate=validate.OneOf(["retail", "wholesale", "both"]),
    )

    @pre_load
    def trim_business_name(self, data, **kwargs):
        data = dict(data or {})
        if isinstance(data.get("name"), str):
            data["name"] = data["name"].strip()
        return data


class PlatformBusinessStatusSchema(Schema):
    status = fields.String(required=True, validate=validate.OneOf(["active", "suspended"]))


class PlatformOwnerStatusSchema(Schema):
    is_active = fields.Boolean(required=True, data_key="isActive")


class SubscriptionPlanSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(load_default="", validate=validate.Length(max=500))
    monthly_price = fields.Decimal(
        required=True,
        as_string=False,
        places=2,
        validate=validate.Range(min=Decimal("0"), max=Decimal("9999999999.99")),
        data_key="monthlyPrice",
    )
    annual_price = fields.Decimal(
        required=True,
        as_string=False,
        places=2,
        validate=validate.Range(min=Decimal("0"), max=Decimal("9999999999.99")),
        data_key="annualPrice",
    )
    is_active = fields.Boolean(load_default=True, data_key="isActive")

    @pre_load
    def trim_plan_fields(self, data, **kwargs):
        data = dict(data or {})
        for key in ("name", "description"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        return data


class BusinessPlanAssignmentSchema(Schema):
    plan_id = fields.Integer(required=True, allow_none=True, data_key="planId", validate=validate.Range(min=1))


class PlatformSupportCaseSchema(Schema):
    business_id = fields.Integer(allow_none=True, data_key="businessId", validate=validate.Range(min=1))
    subject = fields.String(required=True, validate=validate.Length(min=1, max=180))
    description = fields.String(required=True, validate=validate.Length(min=1, max=5000))
    priority = fields.String(
        load_default="normal",
        validate=validate.OneOf(["low", "normal", "high", "urgent"]),
    )
    status = fields.String(
        load_default="open",
        validate=validate.OneOf(["open", "in_progress", "resolved"]),
    )

    @pre_load
    def trim_support_fields(self, data, **kwargs):
        data = dict(data or {})
        for key in ("subject", "description"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        return data


class PlatformSupportCaseStatusSchema(Schema):
    status = fields.String(required=True, validate=validate.OneOf(["open", "in_progress", "resolved"]))


class StorefrontSettingsSchema(Schema):
    storefront_enabled = fields.Boolean(required=True, data_key="storefrontEnabled")
    storefront_description = fields.String(
        load_default="",
        data_key="storefrontDescription",
        validate=validate.Length(max=500),
    )
    storefront_logo_url = fields.Url(
        allow_none=True,
        load_default=None,
        data_key="storefrontLogoUrl",
        schemes={"http", "https"},
    )
    storefront_brand_color = fields.String(
        required=True,
        data_key="storefrontBrandColor",
        validate=validate.Regexp(r"^#[0-9A-Fa-f]{6}$"),
    )
    storefront_contact_email = fields.Email(
        allow_none=True,
        load_default=None,
        data_key="storefrontContactEmail",
    )
    storefront_contact_phone = fields.String(
        allow_none=True,
        load_default=None,
        data_key="storefrontContactPhone",
        validate=validate.Length(max=80),
    )
    storefront_address = fields.String(
        allow_none=True,
        load_default=None,
        data_key="storefrontAddress",
        validate=validate.Length(max=500),
    )


class ShopCustomerRegistrationSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=160))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    phone = fields.String(required=True, validate=validate.Length(min=1, max=80))
    address = fields.String(load_default="", validate=validate.Length(max=500))

    @pre_load
    def normalize_shop_customer(self, data, **kwargs):
        data = dict(data or {})
        for key in ("name", "email", "phone", "address"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        if isinstance(data.get("email"), str):
            data["email"] = data["email"].lower()
        return data


class ShopCustomerLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

    @pre_load
    def normalize_shop_customer_login(self, data, **kwargs):
        data = dict(data or {})
        if isinstance(data.get("email"), str):
            data["email"] = data["email"].strip().lower()
        return data


class ShopCustomerProfileSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=160))
    phone = fields.String(required=True, validate=validate.Length(min=1, max=80))
    address = fields.String(load_default="", validate=validate.Length(max=500))

    @pre_load
    def trim_shop_customer_profile(self, data, **kwargs):
        data = dict(data or {})
        for key in ("name", "phone", "address"):
            if isinstance(data.get(key), str):
                data[key] = data[key].strip()
        return data


class ShopOrderItemSchema(Schema):
    product_id = fields.Integer(required=True, data_key="productId", validate=validate.Range(min=1))
    quantity = fields.Integer(required=True, validate=validate.Range(min=1, max=1000))


class ShopCheckoutSchema(Schema):
    items = fields.List(fields.Nested(ShopOrderItemSchema), required=True, validate=validate.Length(min=1, max=100))
    fulfillment_type = fields.String(
        required=True,
        data_key="fulfillmentType",
        validate=validate.OneOf(["pickup", "delivery"]),
    )
    delivery_address = fields.String(
        load_default="",
        data_key="deliveryAddress",
        validate=validate.Length(max=500),
    )

    @validates_schema
    def validate_delivery_details(self, data, **kwargs):
        if data.get("fulfillment_type") == "delivery" and not data.get("delivery_address", "").strip():
            raise ValidationError({"deliveryAddress": ["A delivery address is required."]})
