from datetime import date

from models import InventoryTransaction, Product, Sale, SaleItem, db
from utils.errors import ApiError


def adjust_stock(product, transaction_type, quantity, reason=""):
    if quantity <= 0:
        raise ApiError("Quantity must be greater than zero", 422)

    if transaction_type == "stock_in":
        product.quantity += quantity
    elif transaction_type == "stock_out":
        if product.quantity < quantity:
            raise ApiError(f"Insufficient stock for {product.name}", 409)
        product.quantity -= quantity
    else:
        raise ApiError("transactionType must be stock_in or stock_out", 422)

    db.session.add(
        InventoryTransaction(
            business_id=product.business_id,
            product_id=product.id,
            transaction_type=transaction_type,
            quantity=quantity,
            reason=reason,
            date=date.today(),
        )
    )


def sync_sale_for_completed_order(order):
    if order.status != "Completed":
        return None

    sale = order.sale or Sale(
        business_id=order.business_id,
        order_id=order.id,
        customer_id=order.customer_id,
    )
    sale.business_id = order.business_id
    sale.customer_id = order.customer_id
    sale.total_quantity = order.total_quantity
    sale.total_amount = order.total_price
    sale.date = order.date
    sale.items = []

    for item in order.items:
        sale.items.append(
            SaleItem(
                business_id=order.business_id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
        )

    db.session.add(sale)
    return sale


def remove_sale_for_order(order):
    if order.sale and order.status != "Completed":
        db.session.delete(order.sale)


def get_product_or_404(product_id):
    product = Product.query.filter_by(id=product_id).first()
    if not product:
        raise ApiError("Product not found", 404)
    return product
