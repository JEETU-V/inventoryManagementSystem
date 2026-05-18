import { Bell, Search, UserCircle } from "lucide-react";

function Navbar() {
  return (
    <nav className="bg-white border-b shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome Back 👋
          </h1>
          <p className="text-sm text-gray-500">
            Manage your inventory efficiently
          </p>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex items-center bg-gray-100 px-4 py-2 rounded-lg">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none ml-2 text-sm"
            />
          </div>

          {/* Notification */}
          <button className="p-2 rounded-full hover:bg-gray-100 transition">
            <Bell size={20} className="text-gray-600" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2 cursor-pointer">
            <UserCircle size={32} className="text-gray-700" />
            <div>
              <p className="text-sm font-medium text-gray-800">Admin</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;