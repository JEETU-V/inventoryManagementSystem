import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAppData } from "../contexts/AppContext";
import OrderTable from "../features/orders/OrderTable";
import AddOrderModal from "../features/orders/AddOrderModal";

function Orders() {
  const { orders, products, customers, addOrder } = useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredOrders = orders.filter((order) =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
          <p className="text-gray-500 mt-1">Track sales orders, order status, and stock movement.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-lg hover:bg-purple-700 transition"
        >
          <Plus size={18} /> New Order
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center bg-gray-100 px-4 py-3 rounded-lg">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none ml-2 w-full"
          />
        </div>
      </div>

      <OrderTable orders={filteredOrders} />

      <AddOrderModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        products={products}
        customers={customers}
        onAddOrder={addOrder}
      />
    </div>
  );
}

export default Orders;
