from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import func

from models import Customer, Order, OrderItem, Product, Supplier, SupplierTransaction
from services.serializers import money, order_to_dict, product_to_dict


def _order_revenue():
    return (
        Order.query.filter(Order.status == "Completed")
        .with_entities(func.coalesce(func.sum(Order.total_price), 0))
        .scalar()
    )


def dashboard_summary():
    total_purchase = SupplierTransaction.query.with_entities(
        func.coalesce(func.sum(SupplierTransaction.total_cost), 0)
    ).scalar()
    order_revenue = _order_revenue()
    low_stock_products = Product.query.filter(Product.quantity <= Product.reorder_level).all()
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    recent_purchases = SupplierTransaction.query.order_by(SupplierTransaction.created_at.desc()).limit(5).all()
    pending_orders = Order.query.filter(Order.status == "Pending").count()

    return {
        "totalProducts": Product.query.count(),
        "totalSuppliers": Supplier.query.count(),
        "totalCustomers": Customer.query.count(),
        "totalOrders": Order.query.count(),
        "pendingOrders": pending_orders,
        "totalSales": money(order_revenue),
        "totalSalesValue": float(order_revenue or 0),
        "totalPurchase": money(total_purchase),
        "totalPurchaseValue": float(total_purchase or 0),
        "totalProfit": money((order_revenue or 0) - (total_purchase or 0)),
        "totalProfitValue": float((order_revenue or 0) - (total_purchase or 0)),
        "lowStockProducts": [product_to_dict(product) for product in low_stock_products],
        "recentTransactions": {
            "orders": [order_to_dict(order) for order in recent_orders],
            "purchases": [
                {
                    "id": tx.id,
                    "supplierName": tx.supplier.name if tx.supplier else "",
                    "productName": tx.product.name if tx.product else "",
                    "quantity": tx.quantity,
                    "totalCost": money(tx.total_cost),
                    "date": tx.date.isoformat(),
                }
                for tx in recent_purchases
            ],
        },
    }


def sales_summary():
    completed_orders = Order.query.filter(Order.status == "Completed").all()
    daily = defaultdict(float)
    monthly = defaultdict(float)
    total = Decimal("0")

    for order in completed_orders:
        amount = Decimal(str(order.total_price or 0))
        total += amount
        daily[order.date.isoformat()] += float(amount)
        monthly[order.date.strftime("%Y-%m")] += float(amount)

    product_map = defaultdict(lambda: {"quantitySold": 0, "revenue": Decimal("0"), "productName": ""})
    for order in completed_orders:
        for item in order.items:
            entry = product_map[item.product_id]
            entry["productName"] = item.product_name
            entry["quantitySold"] += item.quantity
            entry["revenue"] += Decimal(str(item.total_price or 0))

    top_products = sorted(
        [
            {
                "productId": product_id,
                "productName": data["productName"],
                "quantitySold": data["quantitySold"],
                "revenue": money(data["revenue"]),
                "revenueValue": float(data["revenue"]),
            }
            for product_id, data in product_map.items()
        ],
        key=lambda row: row["revenueValue"],
        reverse=True,
    )[:5]

    order_count = len(completed_orders)
    return {
        "totalSales": money(total),
        "totalSalesValue": float(total),
        "completedOrders": order_count,
        "averageOrderValue": money(total / order_count) if order_count else money(0),
        "averageOrderValueRaw": float(total / order_count) if order_count else 0,
        "dailySales": [
            {"date": key, "amount": money(value), "amountValue": value}
            for key, value in sorted(daily.items())
        ],
        "monthlySales": [
            {"month": key, "amount": money(value), "amountValue": value}
            for key, value in sorted(monthly.items())
        ],
        "topProducts": top_products,
    }


def profit_summary():
    purchase_total = SupplierTransaction.query.with_entities(
        func.coalesce(func.sum(SupplierTransaction.total_cost), 0)
    ).scalar()
    revenue = _order_revenue()
    purchase = Decimal(str(purchase_total or 0))
    revenue_amount = Decimal(str(revenue or 0))
    profit = revenue_amount - purchase

    return {
        "date": date.today().isoformat(),
        "revenue": money(revenue_amount),
        "revenueValue": float(revenue_amount),
        "expenses": money(purchase),
        "expensesValue": float(purchase),
        "profit": money(profit),
        "profitValue": float(profit),
    }


def product_profit_breakdown():
    product_rows = {}

    for product in Product.query.all():
        product_rows[product.id] = {
            "productId": product.id,
            "productName": product.name,
            "supplierId": product.supplier_id,
            "purchasedQty": 0,
            "purchaseCost": Decimal("0"),
            "purchaseCostValue": 0,
            "soldQty": 0,
            "salesRevenue": Decimal("0"),
            "salesRevenueValue": 0,
            "profit": Decimal("0"),
            "profitValue": 0,
        }

    for transaction in SupplierTransaction.query.all():
        row = product_rows.setdefault(
            transaction.product_id,
            {
                "productId": transaction.product_id,
                "productName": transaction.product.name if transaction.product else "",
                "supplierId": transaction.supplier_id,
                "purchasedQty": 0,
                "purchaseCost": Decimal("0"),
                "purchaseCostValue": 0,
                "soldQty": 0,
                "salesRevenue": Decimal("0"),
                "salesRevenueValue": 0,
                "profit": Decimal("0"),
                "profitValue": 0,
            },
        )
        row["purchasedQty"] += transaction.quantity
        row["purchaseCost"] += Decimal(str(transaction.total_cost or 0))

    completed_items = (
        OrderItem.query.join(Order)
        .filter(Order.status == "Completed")
        .all()
    )
    for item in completed_items:
        row = product_rows.setdefault(
            item.product_id,
            {
                "productId": item.product_id,
                "productName": item.product_name,
                "supplierId": item.supplier_id,
                "purchasedQty": 0,
                "purchaseCost": Decimal("0"),
                "purchaseCostValue": 0,
                "soldQty": 0,
                "salesRevenue": Decimal("0"),
                "salesRevenueValue": 0,
                "profit": Decimal("0"),
                "profitValue": 0,
            },
        )
        row["soldQty"] += item.quantity
        row["salesRevenue"] += Decimal(str(item.total_price or 0))

    breakdown = []
    for row in product_rows.values():
        profit = row["salesRevenue"] - row["purchaseCost"]
        row["purchaseCostValue"] = float(row["purchaseCost"])
        row["salesRevenueValue"] = float(row["salesRevenue"])
        row["profitValue"] = float(profit)
        row["purchaseCost"] = money(row["purchaseCost"])
        row["salesRevenue"] = money(row["salesRevenue"])
        row["profit"] = money(profit)
        breakdown.append(row)

    breakdown.sort(key=lambda item: item["salesRevenueValue"], reverse=True)

    total_purchase = sum(item["purchaseCostValue"] for item in breakdown)
    total_sales = sum(item["salesRevenueValue"] for item in breakdown)

    return {
        "totalPurchase": money(total_purchase),
        "totalPurchaseValue": total_purchase,
        "totalSales": money(total_sales),
        "totalSalesValue": total_sales,
        "totalProfit": money(total_sales - total_purchase),
        "totalProfitValue": total_sales - total_purchase,
        "products": breakdown,
    }
