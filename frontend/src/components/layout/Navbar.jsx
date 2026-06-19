import { useState } from "react";
import { Bell, Search, UserCircle, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppData } from "../../contexts/AppContext";

function Navbar() {
  const { user, logout, lowStockProducts, apiError } = useAppData();
  const [showAlerts, setShowAlerts] = useState(false);

  return (
    <nav className="bg-white border-b shadow-sm px-6 py-4">
      {apiError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-sm text-gray-500">Manage your inventory efficiently</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAlerts((open) => !open)}
              className="relative rounded-full p-2 transition hover:bg-gray-100"
              title="Low stock alerts"
            >
              <Bell size={20} className="text-gray-600" />
              {lowStockProducts.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {lowStockProducts.length}
                </span>
              )}
            </button>

            {showAlerts && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border bg-white shadow-lg">
                <div className="border-b px-4 py-3">
                  <p className="font-semibold text-gray-800">Low Stock Alerts</p>
                  <p className="text-xs text-gray-500">
                    {lowStockProducts.length === 0
                      ? "All products are above reorder level."
                      : `${lowStockProducts.length} item(s) need attention.`}
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {lowStockProducts.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No alerts right now.</p>
                  ) : (
                    lowStockProducts.map((product) => (
                      <Link
                        key={product.id}
                        to="/inventory"
                        onClick={() => setShowAlerts(false)}
                        className="block border-b px-4 py-3 text-sm hover:bg-gray-50 last:border-b-0"
                      >
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-gray-500">
                          {product.quantity} left — reorder at {product.reorderLevel}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-default">
              <UserCircle size={32} className="text-gray-700" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {user?.name ?? "Inventory User"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === "admin" ? "Administrator" : user?.role === "staff" ? "Staff" : "Viewer"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 transition"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
