from collections import defaultdict
from datetime import date

from sqlalchemy import func

from models import Customer, Order, Product, Sale, Supplier, SupplierTransaction
from services.serializers import money, order_to_dict, product_to_dict


def dashboard_summary():
    total_sales = Sale.query.with_entities(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()
    total_purchase = SupplierTransaction.query.with_entities(
        func.coalesce(func.sum(SupplierTransaction.total_cost), 0)
    ).scalar()
    low_stock_products = Product.query.filter(Product.quantity <= Product.reorder_level).all()
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    recent_purchases = SupplierTransaction.query.order_by(SupplierTransaction.created_at.desc()).limit(5).all()

    return {
        "totalProducts": Product.query.count(),
        "totalSuppliers": Supplier.query.count(),
        "totalCustomers": Customer.query.count(),
        "totalOrders": Order.query.count(),
        "totalSales": money(total_sales),
        "totalSalesValue": float(total_sales or 0),
        "totalProfit": money((total_sales or 0) - (total_purchase or 0)),
        "totalProfitValue": float((total_sales or 0) - (total_purchase or 0)),
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
    sales = Sale.query.order_by(Sale.date.desc()).all()
    daily = defaultdict(float)
    monthly = defaultdict(float)
    total = 0
    for sale in sales:
        amount = float(sale.total_amount or 0)
        total += amount
        daily[sale.date.isoformat()] += amount
        monthly[sale.date.strftime("%Y-%m")] += amount

    return {
        "totalSales": money(total),
        "totalSalesValue": total,
        "dailySales": [{"date": key, "amount": money(value), "amountValue": value} for key, value in sorted(daily.items())],
        "monthlySales": [{"month": key, "amount": money(value), "amountValue": value} for key, value in sorted(monthly.items())],
    }


def profit_summary():
    revenue = Sale.query.with_entities(func.coalesce(func.sum(Sale.total_amount), 0)).scalar()
    expenses = SupplierTransaction.query.with_entities(
        func.coalesce(func.sum(SupplierTransaction.total_cost), 0)
    ).scalar()
    return {
        "date": date.today().isoformat(),
        "revenue": money(revenue),
        "revenueValue": float(revenue or 0),
        "expenses": money(expenses),
        "expensesValue": float(expenses or 0),
        "profit": money((revenue or 0) - (expenses or 0)),
        "profitValue": float((revenue or 0) - (expenses or 0)),
    }

