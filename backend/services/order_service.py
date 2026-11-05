from datetime import date
from decimal import Decimal

from models import Customer, Order, OrderItem, Product, db
from services.inventory_service import adjust_stock, remove_sale_for_order, sync_sale_for_completed_order
from utils.errors import ApiError


VALID_STATUSES = {"Pending", "Completed", "Cancelled"}


def generate_order_number():
    latest = Order.query.order_by(Order.id.desc()).first()
    next_id = (latest.id + 1) if latest else 1001
    return f"ORD-{next_id}"


def create_order(data):
    customer = Customer.query.filter_by(id=data["customer_id"]).first()
    if not customer:
        raise ApiError("Customer not found", 404)

    order = Order(
        business_id=customer.business_id,
        order_number=generate_order_number(),
        customer_id=data["customer_id"],
        status="Pending",
        date=date.today(),
    )

    total_quantity = 0
    total_price = Decimal("0.00")

    for line in data["items"]:
        product = Product.query.filter_by(
            id=line["product_id"],
            business_id=customer.business_id,
        ).first()
        if not product:
            raise ApiError("Product not found", 404)

        quantity = int(line["quantity"])
        discount = Decimal(line.get("discount") or 0)
        if quantity <= 0:
            raise ApiError("Order quantity must be greater than zero", 422)
        if discount < 0 or discount > 100:
            raise ApiError("Discount must be between 0 and 100", 422)

        line_total = Decimal(product.price) * quantity * (Decimal("1") - discount / Decimal("100"))
        order.items.append(
            OrderItem(
                business_id=customer.business_id,
                product_id=product.id,
                product_name=product.name,
                supplier_id=product.supplier_id,
                unit_price=product.price,
                quantity=quantity,
                discount=discount,
                total_price=line_total,
            )
        )
        total_quantity += quantity
        total_price += line_total

        adjust_stock(product, "stock_out", quantity, f"Order {order.order_number}")

    order.total_quantity = total_quantity
    order.total_price = total_price
    db.session.add(order)
    db.session.flush()
    sync_sale_for_completed_order(order)
    return order


def update_order_status(order, status):
    if status not in VALID_STATUSES:
        raise ApiError("Invalid order status", 422)

    previous_status = order.status
    if previous_status in {"Completed", "Cancelled"} and status != previous_status:
        raise ApiError(f"{previous_status} orders cannot be changed to another status", 409)
    if previous_status != "Cancelled" and status == "Cancelled":
        for item in order.items:
            product = Product.query.filter_by(
                id=item.product_id,
                business_id=order.business_id,
            ).first()
            if product:
                adjust_stock(product, "stock_in", item.quantity, f"Cancelled order {order.order_number}")
    order.status = status
    if status == "Completed":
        sync_sale_for_completed_order(order)
    else:
        remove_sale_for_order(order)
    return order
