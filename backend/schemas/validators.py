from marshmallow import Schema, ValidationError, fields, validates_schema


def validate_payload(schema_cls, payload, partial=False):
    schema = schema_cls(partial=partial)
    try:
        return schema.load(payload or {})
    except ValidationError as error:
        from utils.errors import ApiError

        raise ApiError("Validation failed", 422, error.messages) from error


class ProductSchema(Schema):
    supplier_id = fields.Integer(allow_none=True, data_key="supplierId")
    name = fields.String(required=True)
    sku = fields.String(required=True)
    category = fields.String(load_default="")
    purchase_price = fields.Decimal(required=True, as_string=False, data_key="purchasePrice")
    quantity = fields.Integer(required=True)
    price = fields.Decimal(required=True, as_string=False)
    reorder_level = fields.Integer(required=True, data_key="reorderLevel")


class SupplierSchema(Schema):
    name = fields.String(required=True)
    contact = fields.String(required=True)
    email = fields.Email(required=True)
    products_supplied = fields.String(required=True, data_key="productsSupplied")


class SupplierTransactionSchema(Schema):
    supplier_id = fields.Integer(required=True, data_key="supplierId")
    product_id = fields.Integer(required=True, data_key="productId")
    quantity = fields.Integer(required=True)
    total_cost = fields.Decimal(required=True, as_string=False, data_key="totalCost")
    date = fields.Date(required=True)


class CustomerSchema(Schema):
    name = fields.String(required=True)
    phone = fields.String(required=True)
    email = fields.Email(required=True)
    address = fields.String(required=True)


class OrderItemSchema(Schema):
    product_id = fields.Integer(required=True, data_key="productId")
    quantity = fields.Integer(required=True)
    discount = fields.Decimal(load_default=0, as_string=False)


class OrderSchema(Schema):
    customer_id = fields.Integer(required=True, data_key="customerId")
    status = fields.String(load_default="Pending")
    items = fields.List(fields.Nested(OrderItemSchema), required=True)

    @validates_schema
    def validate_items(self, data, **kwargs):
        if not data.get("items"):
            raise ValidationError({"items": ["At least one order item is required."]})


class OrderStatusSchema(Schema):
    status = fields.String(required=True)


class InventoryTransactionSchema(Schema):
    product_id = fields.Integer(required=True, data_key="productId")
    transaction_type = fields.String(required=True, data_key="transactionType")
    quantity = fields.Integer(required=True)
    reason = fields.String(load_default="")


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

