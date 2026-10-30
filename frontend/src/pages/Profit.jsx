import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { apiClient } from "../services/api";
import { exportToCsv } from "../utils/exportCsv";

function Profit() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient.get("/profit/reports")
      .then(({ data }) => {
        if (active) setReport(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load the profit report.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const summary = report?.summary;
  const products = report?.breakdown?.products ?? [];
  const hasValidReport = summary && report?.breakdown && typeof summary.profitValue === "number";

  function handleExport() {
    exportToCsv(
      "profit-report.csv",
      ["Product", "Purchased Qty", "Supplier Purchase Cost", "Sold Qty", "Sales Revenue", "Cost of Goods Sold", "Gross Profit"],
      products.map((product) => [
        product.productName,
        product.purchasedQty,
        product.purchaseCostValue,
        product.soldQty,
        product.salesRevenueValue,
        product.costOfGoodsSoldValue,
        product.grossProfitValue,
      ])
    );
  }

  if (isLoading) {
    return <p className="rounded-xl border bg-white p-6 text-sm text-gray-600">Loading profit report…</p>;
  }

  if (error) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</p>;
  }
  if (!hasValidReport) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">The profit report returned incomplete data. Refresh the page or contact an administrator.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Profit Dashboard</h1>
          <p className="mt-1 text-gray-500">Compare completed sales with the cost of the products sold.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={products.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Supplier purchases", summary.supplierPurchases],
          ["Completed sales", summary.revenue],
          ["Cost of goods sold", report.breakdown.totalCostOfGoodsSold],
          ["Estimated gross profit", summary.profit],
        ].map(([label, amount]) => (
          <article key={label} className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500">{label}</h2>
            <p className={`mt-3 text-2xl font-bold ${label === "Estimated gross profit" && summary.profitValue < 0 ? "text-red-700" : "text-gray-800"}`}>
              {amount}
            </p>
          </article>
        ))}
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Gross profit uses the weighted average recorded purchase cost for each product. If no supplier purchases are recorded, it uses the product’s current purchase price. It does not include rent, wages, tax, or other operating expenses.
      </p>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b bg-gray-50 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-800">Product profit breakdown</h2>
          <p className="mt-1 text-sm text-gray-500">Purchase totals are shown separately from the cost of units sold.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-white">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Purchased qty</th>
                <th className="p-4">Purchase cost</th>
                <th className="p-4">Sold qty</th>
                <th className="p-4">Sales revenue</th>
                <th className="p-4">Cost of goods sold</th>
                <th className="p-4">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-sm text-gray-500">No product sales or purchases recorded yet.</td></tr>
              ) : products.map((product) => (
                <tr key={product.productId} className="border-t">
                  <td className="p-4 font-medium">{product.productName}</td>
                  <td className="p-4">{product.purchasedQty}</td>
                  <td className="p-4">{product.purchaseCost}</td>
                  <td className="p-4">{product.soldQty}</td>
                  <td className="p-4">{product.salesRevenue}</td>
                  <td className="p-4">{product.costOfGoodsSold}</td>
                  <td className={`p-4 font-semibold ${product.grossProfitValue < 0 ? "text-red-700" : "text-green-700"}`}>
                    {product.grossProfit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Profit;
