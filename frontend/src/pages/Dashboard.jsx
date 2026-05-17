function Dashboard() {
  const stats = [
    {
      title: "Total Products",
      value: "120",
    },
    {
      title: "Low Stock Items",
      value: "8",
    },
    {
      title: "Suppliers",
      value: "24",
    },
    {
      title: "Inventory Value",
      value: "₹2,45,000",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-2">
          Welcome back! Here’s an overview of your inventory system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm p-6 border"
          >
            <h3 className="text-gray-500 text-sm font-medium">
              {stat.title}
            </h3>

            <p className="text-3xl font-bold text-gray-800 mt-3">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-4">
          <button className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition">
            Add Product
          </button>

          <button className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition">
            Update Stock
          </button>

          <button className="bg-purple-600 text-white px-5 py-3 rounded-lg hover:bg-purple-700 transition">
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;