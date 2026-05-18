import { useNavigate } from "react-router-dom";
import { useAppData } from "../contexts/AppContext";

function Dashboard() {
  const navigate = useNavigate();
  const {
    totalProducts,
    lowStockCount,
    totalSuppliers,
    totalCustomers,
    inventoryValue,
    products,
  } = useAppData();

  const stats = [
    {
      title: "Total Products",
      value: totalProducts,
    },
    {
      title: "Low Stock Items",
      value: lowStockCount,
    },
    {
      title: "Suppliers",
      value: totalSuppliers,
    },
    {
      title: "Customers",
      value: totalCustomers,
    },
  ];

  const lowStockProducts = products.filter(
    (product) => product.quantity <= product.reorderLevel
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Welcome back! Manage stationery orders, stock, customers, and suppliers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border">
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-800 mt-3">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/products")}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Manage Products
            </button>
            <button
              onClick={() => navigate("/orders")}
              className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Track Orders
            </button>
            <button
              onClick={() => navigate("/customers")}
              className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition"
            >
              View Customers
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Value</h2>
          <p className="text-3xl font-bold text-gray-800">₹{inventoryValue.toLocaleString("en-IN")}</p>
          <p className="text-gray-500 mt-2">Current stock worth across all products.</p>

          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-gray-700">Low stock alerts</h3>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-gray-500">All items are currently above reorder level.</p>
            ) : (
              <ul className="list-disc list-inside text-sm text-gray-600">
                {lowStockProducts.map((product) => (
                  <li key={product.id}>
                    {product.name} — {product.quantity} left (reorder at {product.reorderLevel})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
