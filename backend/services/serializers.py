from decimal import Decimal


def money(value):
    amount = Decimal(value or 0)
    if amount == amount.to_integral():
        return f"₹{int(amount):,}"
    return f"₹{amount:,.2f}"


def number(value):
    return float(value or 0)


def user_to_dict(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


def supplier_to_dict(supplier):
    return {
        "id": supplier.id,
        "name": supplier.name,
        "contact": supplier.contact,
        "email": supplier.email,
        "productsSupplied": supplier.products_supplied,
    }


def product_to_dict(product):
    return {
        "id": product.id,
        "supplierId": product.supplier_id,
        "name": product.name,
        "sku": product.sku,
        "category": product.category,
        "purchasePrice": money(product.purchase_price),
        "purchasePriceValue": number(product.purchase_price),
        "quantity": product.quantity,
        "price": money(product.price),
        "priceValue": number(product.price),
        "reorderLevel": product.reorder_level,
    }


def customer_to_dict(customer):
    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
    }


def supplier_transaction_to_dict(transaction):
    return {
        "id": transaction.id,
        "supplierId": transaction.supplier_id,
        "supplierName": transaction.supplier.name if transaction.supplier else "",
        "productId": transaction.product_id,
        "productName": transaction.product.name if transaction.product else "",
        "quantity": transaction.quantity,
        "totalCost": money(transaction.total_cost),
        "totalCostValue": number(transaction.total_cost),
        "date": transaction.date.isoformat(),
    }


def order_item_to_dict(item):
    return {
        "productId": item.product_id,
        "productName": item.product_name,
        "supplierId": item.supplier_id,
        "unitPrice": money(item.unit_price),
        "unitPriceValue": number(item.unit_price),
        "quantity": item.quantity,
        "discount": number(item.discount),
        "totalPrice": money(item.total_price),
        "totalPriceValue": number(item.total_price),
    }


def order_to_dict(order):
    return {
        "id": order.id,
        "orderNumber": order.order_number,
        "customerId": order.customer_id,
        "customerName": order.customer.name if order.customer else "",
        "items": [order_item_to_dict(item) for item in order.items],
        "totalQuantity": order.total_quantity,
        "totalPrice": money(order.total_price),
        "totalPriceValue": number(order.total_price),
        "status": order.status,
        "date": order.date.isoformat(),
    }


def inventory_transaction_to_dict(transaction):
    return {
        "id": transaction.id,
        "productId": transaction.product_id,
        "productName": transaction.product.name if transaction.product else "",
        "transactionType": transaction.transaction_type,
        "quantity": transaction.quantity,
        "reason": transaction.reason,
        "date": transaction.date.isoformat(),
    }

def sale_to_dict(sale):
    return {
        "id": sale.id,
        "orderId": sale.order_id,
        "customerId": sale.customer_id,
        "customerName": sale.customer.name if sale.customer else "",
        "totalQuantity": sale.total_quantity,
        "totalAmount": money(sale.total_amount),
        "totalAmountValue": number(sale.total_amount),
        "date": sale.date.isoformat(),
        "items": [
            {
                "productId": item.product_id,
                "productName": item.product_name,
                "quantity": item.quantity,
                "unitPrice": money(item.unit_price),
                "totalPrice": money(item.total_price),
            }
            for item in sale.items
        ],
    }

