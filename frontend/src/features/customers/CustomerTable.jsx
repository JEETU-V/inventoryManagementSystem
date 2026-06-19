import { Fragment, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { getOrderItems, parseAmount } from "../../utils/orderHelpers";
import EmptyState from "../../components/ui/EmptyState";

function CustomerTable({ customers, orders, onEdit, onDelete, canEdit = true, canDelete = true }) {
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  function customerOrders(customerId) {
    return orders.filter(
      (order) => order.customerId === customerId && order.status === "Completed"
    );
  }

  function customerTotal(customerId) {
    return customerOrders(customerId).reduce(
      (sum, order) => sum + parseAmount(order.totalPrice),
      0
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="p-4">Name</th>
            <th className="p-4">Phone</th>
            <th className="p-4">Email</th>
            <th className="p-4">Total Purchase</th>
            <th className="p-4">Orders</th>
            <th className="p-4">History</th>
            {(canEdit || canDelete) && <th className="p-4">Actions</th>}
          </tr>
        </thead>

        <tbody>
          {customers.length === 0 ? (
            <EmptyState
              title="No customers found"
              description="Add a customer or adjust your search."
            />
          ) : (
            customers.map((customer) => {
              const ordersForCustomer = customerOrders(customer.id);
              const totalAmount = customerTotal(customer.id);
              const isExpanded = expandedCustomer === customer.id;

              return (
                <Fragment key={customer.id}>
                  <tr className="border-t hover:bg-gray-50 transition">
                    <td className="p-4 font-medium">{customer.name}</td>
                    <td className="p-4">{customer.phone}</td>
                    <td className="p-4">{customer.email}</td>
                    <td className="p-4">₹{totalAmount.toLocaleString("en-IN")}</td>
                    <td className="p-4">{ordersForCustomer.length}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCustomer(isExpanded ? null : customer.id)
                        }
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="p-4">
                        <div className="flex gap-3">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit?.(customer)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit customer"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete?.(customer.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete customer"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50">
                      <td colSpan={canEdit || canDelete ? 7 : 6} className="p-4">
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-800">
                            Past Orders ({ordersForCustomer.length})
                          </h3>
                          {ordersForCustomer.length === 0 ? (
                            <p className="text-sm text-gray-500">No orders placed yet.</p>
                          ) : (
                            <div className="grid gap-3">
                              {ordersForCustomer.map((order) => (
                                <div
                                  key={order.id}
                                  className="rounded-xl border bg-white p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-gray-800">
                                        {order.orderNumber}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {getOrderItems(order).map((item, index, items) => (
                                          <span key={`${item.productId}-${item.discount}`}>
                                            {item.productName} • Qty {item.quantity}
                                            {index < items.length - 1 ? "; " : ""}
                                          </span>
                                        ))}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-gray-800">
                                        {order.totalPrice}
                                      </p>
                                      <p className="text-sm text-gray-500">{order.date}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerTable;
