import { Bell, Search, UserCircle, LogOut } from "lucide-react";
import { useAppData } from "../../contexts/AppContext";

function Navbar() {
  const { user, logout } = useAppData();

  return (
    <nav className="bg-white border-b shadow-sm px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back 👋</h1>
          <p className="text-sm text-gray-500">Manage your inventory efficiently</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-100 px-4 py-2 rounded-lg">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none ml-2 text-sm"
            />
          </div>

          <button className="p-2 rounded-full hover:bg-gray-100 transition">
            <Bell size={20} className="text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-default">
              <UserCircle size={32} className="text-gray-700" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {user?.name ?? "Inventory User"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === "admin" ? "Administrator" : "Staff"}
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