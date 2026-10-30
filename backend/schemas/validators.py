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
