import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-2xl font-bold">Inventory System</h2>
      </div>

      <nav className="flex flex-col p-4 gap-2">
        <Link
          to="/dashboard"
          className="px-4 py-3 rounded-lg hover:bg-slate-800 transition"
        >
          Dashboard
        </Link>

        <Link
          to="/inventory"
          className="px-4 py-3 rounded-lg hover:bg-slate-800 transition"
        >
          Inventory
        </Link>

        <Link
          to="/products"
          className="px-4 py-3 rounded-lg hover:bg-slate-800 transition"
        >
          Products
        </Link>

        <Link
          to="/suppliers"
          className="px-4 py-3 rounded-lg hover:bg-slate-800 transition"
        >
          Suppliers
        </Link>
      </nav>
    </aside>
  );
}

export default Sidebar;