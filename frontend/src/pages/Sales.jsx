import { Download } from "lucide-react";
import { useAppData } from "../contexts/useAppData";
import { exportToCsv } from "../utils/exportCsv";

function Sales() {
  const { salesSummary } = useAppData();
  const totalSales = salesSummary?.totalSalesValue ?? 0;
  const totalOrders = salesSummary?.completedOrders ?? 0;
  const averageOrderValue = salesSummary?.averageOrderValueRaw ?? 0;
  const topProducts = salesSummary?.topProducts ?? [];

  function handleExport() {
    exportToCsv(
      "sales-report.csv",
      ["Product", "Qty Sold", "Revenue"],
      topProducts.map((product) => [
        product.productName,
        product.quantitySold,
        product.revenueValue,
      ])
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sales Dashboard</h1>
          <p className="text-gray-500 mt-1">Review completed order revenue, average order value, and top-selling products.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={topProducts.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-medium text-gray-500">Completed Orders</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">{totalOrders}</p>
          <p className="text-sm text-gray-500 mt-2">Orders that are successfully completed and counted as revenue.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Sales</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">{salesSummary?.totalSales ?? `₹${totalSales.toLocaleString("en-IN")}`}</p>
          <p className="text-sm text-gray-500 mt-2">Total revenue from completed customer orders.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-medium text-gray-500">Average Order Value</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">{salesSummary?.averageOrderValue ?? `₹${averageOrderValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}</p>
          <p className="text-sm text-gray-500 mt-2">Average revenue per completed order.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-5 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Top Selling Products</h2>
          <p className="text-sm text-gray-500 mt-1">Top 5 products by completed order revenue.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Qty Sold</th>
                <th className="p-4">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-sm text-gray-500">
                    No completed sales yet.
                  </td>
                </tr>
              ) : (
                topProducts.map((product) => (
                  <tr key={product.productId} className="border-t hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{product.productName}</td>
                    <td className="p-4">{product.quantitySold}</td>
                    <td className="p-4">{product.revenue}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Sales;
