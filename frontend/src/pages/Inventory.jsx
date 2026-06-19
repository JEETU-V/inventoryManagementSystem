import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../contexts/AppContext";

function Inventory() {
  const navigate = useNavigate();
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

  const outOfStock = products.filter((product) => product.quantity === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
        <p className="text-gray-500 mt-1">Monitor stock levels, reorder alerts, and category insights.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
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
          <p className="text-3xl font-bold text-gray-800 mt-3">
            {orders.filter((order) => order.status === "Pending").length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-800">Out of Stock</h2>
          <p className={`text-3xl font-bold mt-3 ${outOfStock.length > 0 ? "text-red-600" : "text-green-600"}`}>
            {outOfStock.length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Stock</h2>
          {Object.keys(categories).length === 0 ? (
            <p className="text-gray-500">No products in inventory yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categories).map(([category, total]) => (
                <div key={category} className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">{category}</span>
                  <span className="font-semibold text-gray-900">{total} units</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Reorder Recommendations</h2>
            {reorderRecommendations.length > 0 && (
              <button
                onClick={() => navigate("/products")}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Manage products
              </button>
            )}
          </div>
          {reorderRecommendations.length === 0 ? (
            <p className="text-gray-500">All inventory looks healthy. No immediate reorder needed.</p>
          ) : (
            <div className="space-y-3">
              {reorderRecommendations.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-xl p-4 border ${
                    product.quantity === 0
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-600">
                    {product.quantity} in stock — reorder level is {product.reorderLevel}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-5 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Stock Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Reorder Level</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                    No products in inventory.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4">{product.category}</td>
                    <td className="p-4">{product.quantity}</td>
                    <td className="p-4">{product.reorderLevel}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          product.quantity === 0
                            ? "bg-red-100 text-red-700"
                            : product.quantity <= product.reorderLevel
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {product.quantity === 0
                          ? "Out of Stock"
                          : product.quantity <= product.reorderLevel
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </td>
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

export default Inventory;
