import { useMemo } from "react";
import { useAppData } from "../contexts/AppContext";
import { getOrderItems, parseAmount } from "../utils/orderHelpers";

function Profit() {
  const { products, orders, supplierTransactions } = useAppData();

  const {
    totalPurchase,
    totalSales,
    totalProfit,
    productProfitData,
  } = useMemo(() => {
    const productMap = new Map();

    products.forEach((product) => {
      productMap.set(product.id, {
        productId: product.id,
        productName: product.name,
        supplierId: product.supplierId,
        purchasedQty: 0,
        purchaseCost: 0,
        soldQty: 0,
        salesRevenue: 0,
      });
    });

    supplierTransactions.forEach((transaction) => {
      const productId = transaction.productId;
      const productRow = productMap.get(productId) || {
        productId,
        productName: transaction.productName,
        supplierId: transaction.supplierId,
        purchasedQty: 0,
        purchaseCost: 0,
        soldQty: 0,
        salesRevenue: 0,
      };

      productRow.purchasedQty += transaction.quantity;
      productRow.purchaseCost += parseAmount(transaction.totalCost);
      productMap.set(productId, productRow);
    });

    orders
      .filter((order) => order.status === "Completed")
      .forEach((order) => {
        getOrderItems(order).forEach((item) => {
          const productId = item.productId;
          const productRow = productMap.get(productId) || {
            productId,
            productName: item.productName,
            supplierId: item.supplierId ?? null,
            purchasedQty: 0,
            purchaseCost: 0,
            soldQty: 0,
            salesRevenue: 0,
          };

          productRow.soldQty += item.quantity;
          productRow.salesRevenue += parseAmount(item.totalPrice);
          productMap.set(productId, productRow);
        });
      });

    const productProfitData = Array.from(productMap.values()).sort((a, b) => b.salesRevenue - a.salesRevenue);

    const totalPurchase = productProfitData.reduce((sum, item) => sum + item.purchaseCost, 0);
    const totalSales = productProfitData.reduce((sum, item) => sum + item.salesRevenue, 0);
    const totalProfit = totalSales - totalPurchase;

    return {
      totalPurchase,
      totalSales,
      totalProfit,
      productProfitData,
    };
  }, [products, orders, supplierTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Profit Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Analyze purchase costs from suppliers and sales revenue from customers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Purchased</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">₹{totalPurchase.toLocaleString("en-IN")}</p>
          <p className="text-sm text-gray-500 mt-2">Supplier purchase cost recorded from supplier entries.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Sold</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">₹{totalSales.toLocaleString("en-IN")}</p>
          <p className="text-sm text-gray-500 mt-2">Revenue collected from customer orders.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-medium text-gray-500">Net Profit / Loss</h2>
          <p className={`text-3xl font-bold mt-3 ${totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
            ₹{totalProfit.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-gray-500 mt-2">Sales revenue minus supplier purchase cost across all tracked products.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-5 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Product Profit Breakdown</h2>
          <p className="text-sm text-gray-500 mt-1">See purchase cost, sold quantity, revenue, and net profit by product.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Purchased Qty</th>
                <th className="p-4">Purchase Cost</th>
                <th className="p-4">Sold Qty</th>
                <th className="p-4">Sales Revenue</th>
                <th className="p-4">Profit</th>
              </tr>
            </thead>
            <tbody>
              {productProfitData.map((product) => {
                const profit = product.salesRevenue - product.purchaseCost;
                return (
                  <tr key={product.productId} className="border-t hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{product.productName}</td>
                    <td className="p-4">{product.purchasedQty}</td>
                    <td className="p-4">₹{product.purchaseCost.toLocaleString("en-IN")}</td>
                    <td className="p-4">{product.soldQty}</td>
                    <td className="p-4">₹{product.salesRevenue.toLocaleString("en-IN")}</td>
                    <td className={`p-4 font-semibold ${profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                      ₹{profit.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Profit;
