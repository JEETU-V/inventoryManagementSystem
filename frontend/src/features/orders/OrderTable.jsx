function OrderTable({ orders }) {
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
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t hover:bg-gray-50 transition">
              <td className="p-4 font-medium">{order.orderNumber}</td>
              <td className="p-4">{order.customerName}</td>
              <td className="p-4">{order.productName}</td>
              <td className="p-4">{order.quantity}</td>
              <td className="p-4">{order.discount ? `${order.discount}%` : "0%"}</td>
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
              <td className="p-4">{order.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OrderTable;
