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
    profit_report = product_profit_breakdown()

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
        "totalProfit": profit_report["totalProfit"],
        "totalProfitValue": profit_report["totalProfitValue"],
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
    cost_of_goods_sold = Decimal(str(product_profit_breakdown()["totalCostOfGoodsSoldValue"]))
    profit = revenue_amount - cost_of_goods_sold

    return {
        "date": date.today().isoformat(),
        "revenue": money(revenue_amount),
        "revenueValue": float(revenue_amount),
        "expenses": money(cost_of_goods_sold),
        "expensesValue": float(cost_of_goods_sold),
        "supplierPurchases": money(purchase),
        "supplierPurchasesValue": float(purchase),
        "profitMethod": "Weighted-average recorded purchase cost; product purchase price is used when no purchase history exists.",
        "profit": money(profit),
        "profitValue": float(profit),
    }


def product_profit_breakdown():
    product_rows = {}
    products = {product.id: product for product in Product.query.all()}

    def row_for(product_id, name="", supplier_id=None):
        return product_rows.setdefault(
            product_id,
            {
                "productId": product_id,
                "productName": name,
                "supplierId": supplier_id,
                "purchasedQty": 0,
                "purchaseCost": Decimal("0"),
                "soldQty": 0,
                "salesRevenue": Decimal("0"),
            },
        )

    for product in products.values():
        row_for(product.id, product.name, product.supplier_id)

    for transaction in SupplierTransaction.query.all():
        row = row_for(
            transaction.product_id,
            transaction.product.name if transaction.product else "",
            transaction.supplier_id,
        )
        row["purchasedQty"] += transaction.quantity
        row["purchaseCost"] += Decimal(str(transaction.total_cost or 0))

    for item in OrderItem.query.join(Order).filter(Order.status == "Completed").all():
        row = row_for(item.product_id, item.product_name, item.supplier_id)
        row["soldQty"] += item.quantity
        row["salesRevenue"] += Decimal(str(item.total_price or 0))

    breakdown = []
    total_purchase = Decimal("0")
    total_sales = Decimal("0")
    total_cost_of_goods_sold = Decimal("0")
    for row in product_rows.values():
        product = products.get(row["productId"])
        average_unit_cost = (
            row["purchaseCost"] / row["purchasedQty"]
            if row["purchasedQty"]
            else Decimal(str(product.purchase_price if product else 0))
        )
        cost_of_goods_sold = average_unit_cost * row["soldQty"]
        gross_profit = row["salesRevenue"] - cost_of_goods_sold
        purchase_cost = row["purchaseCost"]
        sales_revenue = row["salesRevenue"]
        total_purchase += purchase_cost
        total_sales += sales_revenue
        total_cost_of_goods_sold += cost_of_goods_sold
        row["averageUnitCost"] = money(average_unit_cost)
        row["costOfGoodsSold"] = money(cost_of_goods_sold)
        row["costOfGoodsSoldValue"] = float(cost_of_goods_sold)
        row["grossProfit"] = money(gross_profit)
        row["grossProfitValue"] = float(gross_profit)
        row["purchaseCost"] = money(purchase_cost)
        row["purchaseCostValue"] = float(purchase_cost)
        row["salesRevenue"] = money(sales_revenue)
        row["salesRevenueValue"] = float(sales_revenue)
        breakdown.append(row)

    breakdown.sort(key=lambda item: item["salesRevenueValue"], reverse=True)

    return {
        "totalPurchase": money(total_purchase),
        "totalPurchaseValue": float(total_purchase),
        "totalSales": money(total_sales),
        "totalSalesValue": float(total_sales),
        "totalCostOfGoodsSold": money(total_cost_of_goods_sold),
        "totalCostOfGoodsSoldValue": float(total_cost_of_goods_sold),
        "totalProfit": money(total_sales - total_cost_of_goods_sold),
        "totalProfitValue": float(total_sales - total_cost_of_goods_sold),
        "products": breakdown,
    }
