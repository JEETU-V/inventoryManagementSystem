import { useState } from "react";
import { Edit3, Check, X, FileText, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getOrderItems, getOrderQuantity } from "../../utils/orderHelpers";
import EmptyState from "../../components/ui/EmptyState";

function OrderTable({ orders, onUpdateOrderStatus, onCancelOrder }) {
  const navigate = useNavigate();
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [statusDraft, setStatusDraft] = useState("Pending");

  const startEditing = (order) => {
    setEditingOrderId(order.id);
    setStatusDraft(order.status);
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
  };

  const saveStatus = (orderId) => {
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, { status: statusDraft });
    }
    setEditingOrderId(null);
  };

  const handleGenerateBill = (orderId) => {
    navigate(`/bill/${orderId}`);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this order? Stock will be restored if applicable.")) return;
    if (onCancelOrder) {
      await onCancelOrder(orderId);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="p-4">Order #</th>
            <th className="p-4">Customer</th>
            <th className="p-4">Product</th>
            <th className="p-4">Qty</th>
            <th className="p-4">Discount</th>
            <th className="p-4">Total</th>
            <th className="p-4">Status</th>
            <th className="p-4">Date</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {orders.length === 0 ? (
            <EmptyState
              title="No orders found"
              description="Create a new order or adjust your search."
            />
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-4 font-medium">{order.orderNumber}</td>
                <td className="p-4">{order.customerName}</td>
                <td className="p-4">
                  <div className="space-y-2">
                    {getOrderItems(order).map((item) => (
                      <div key={`${item.productId}-${item.discount}`}>
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        <div className="text-sm text-gray-500">
                          Qty {item.quantity} • {item.discount ? `${item.discount}%` : "0%"} off
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-4">{order.totalQuantity ?? getOrderQuantity(order)}</td>
                <td className="p-4">
                  {(() => {
                    const orderItems = getOrderItems(order);
                    return orderItems.length === 1
                      ? `${orderItems[0].discount}%`
                      : "Mixed";
                  })()}
                </td>
                <td className="p-4">{order.totalPrice}</td>
                <td className="p-4">
                  {editingOrderId === order.id ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => saveStatus(order.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 text-white px-3 py-2 text-sm hover:bg-green-700"
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-700 px-3 py-2 text-sm hover:bg-slate-200"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
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
                      {order.status !== "Cancelled" && (
                        <button
                          type="button"
                          onClick={() => startEditing(order)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                          title="Edit status"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-4">{order.date}</td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleGenerateBill(order.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition"
                      title="Generate Bill"
                    >
                      <FileText size={16} />
                      Bill
                    </button>
                    {order.status === "Pending" && onCancelOrder && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded transition"
                        title="Cancel order"
                      >
                        <Ban size={16} />
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default OrderTable;
