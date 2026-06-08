import { useMemo } from "react";
import { useAppData } from "../contexts/AppContext";

function Inventory() {
  const { products, suppliers, orders } = useAppData();

  const categories = useMemo(() => {
    return products.reduce((result, product) => {
      result[product.category] = (result[product.category] || 0) + product.quantity;
      return result;
    }, {});
  }, [products]);

  const reorderRecommendations = products.filter(
    (product) => product.quantity <= product.reorderLevel
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
        <p className="text-gray-500 mt-1">Monitor stock levels, reorder alerts, and category insights.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-800">Total Products</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-800">Suppliers</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-800">Pending Orders</h2>
          <p className="text-3xl font-bold text-gray-800 mt-3">{orders.filter((order) => order.status === "Pending").length}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Stock</h2>
          <div className="space-y-3">
            {Object.entries(categories).map(([category, total]) => (
              <div key={category} className="flex items-center justify-between gap-4">
                <span className="text-gray-700">{category}</span>
                <span className="font-semibold text-gray-900">{total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Reorder Recommendations</h2>
          {reorderRecommendations.length === 0 ? (
            <p className="text-gray-500">All inventory looks healthy. No immediate reorder needed.</p>
          ) : (
            <div className="space-y-3">
              {reorderRecommendations.map((product) => (
                <div key={product.id} className="rounded-xl bg-gray-50 p-4 border">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-600">
                    {product.quantity} in stock — reorder when {product.quantity <= product.reorderLevel ? "below" : "above"} {product.reorderLevel}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Inventory;
