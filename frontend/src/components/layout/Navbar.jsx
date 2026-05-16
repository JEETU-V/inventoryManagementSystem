import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="w-full px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">
          Inventory Management
        </h1>

        <div className="flex items-center gap-6">
          <Link
            to="/dashboard"
            className="text-gray-600 hover:text-blue-600 transition"
          >
            Dashboard
          </Link>

          <Link
            to="/inventory"
            className="text-gray-600 hover:text-blue-600 transition"
          >
            Inventory
          </Link>

          <Link
            to="/products"
            className="text-gray-600 hover:text-blue-600 transition"
          >
            Products
          </Link>

          <Link
            to="/suppliers"
            className="text-gray-600 hover:text-blue-600 transition"
          >
            Suppliers
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;