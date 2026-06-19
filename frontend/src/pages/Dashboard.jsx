import { useNavigate } from "react-router-dom";
import { useAppData } from "../contexts/AppContext";
import { getOrderItems } from "../utils/orderHelpers";

function Dashboard() {
  const navigate = useNavigate();
  const {
    totalProducts,
    lowStockCount,
    totalSuppliers,
    totalCustomers,
    totalOrders,
    inventoryValue,
    products,
    recentOrders,
  } = useAppData();

  const stats = [
    { title: "Total Products", value: totalProducts, color: "text-blue-600" },
    { title: "Low Stock Items", value: lowStockCount, color: lowStockCount > 0 ? "text-amber-600" : "text-green-600" },
    { title: "Suppliers", value: totalSuppliers, color: "text-indigo-600" },
    { title: "Customers", value: totalCustomers, color: "text-green-600" },
    { title: "Total Orders", value: totalOrders, color: "text-purple-600" },
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl shadow-sm p-6 border">
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <p className={`text-3xl font-bold mt-3 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
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
            <button
              onClick={() => navigate("/inventory")}
              className="bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 transition"
            >
              Check Inventory
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
              <ul className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <li
                    key={product.id}
                    className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    {product.name} — {product.quantity} left (reorder at {product.reorderLevel})
                  </li>
                ))}
                {lowStockProducts.length > 5 && (
                  <li className="text-sm text-gray-500">
                    +{lowStockProducts.length - 5} more items need restocking
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-5 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
            <p className="text-sm text-gray-500 mt-1">Latest order activity across the shop.</p>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No orders yet. Create your first order to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{order.orderNumber}</td>
                    <td className="p-4">{order.customerName}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {getOrderItems(order)
                        .map((item) => item.productName)
                        .join(", ")}
                    </td>
                    <td className="p-4">{order.totalPrice}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          order.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : order.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
