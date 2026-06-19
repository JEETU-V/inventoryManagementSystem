import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAppData } from "../contexts/AppContext";
import CustomerTable from "../features/customers/CustomerTable";
import AddCustomerModal from "../features/customers/AddCustomerModal";

function Customers() {
  const { canAddCustomer, customers, orders, addCustomer, updateCustomer, deleteCustomer } =
    useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleEdit(customer) {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  }

  async function handleDelete(customerId) {
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;
    await deleteCustomer(customerId);
  }

  async function handleSaveCustomer(customer) {
    if (selectedCustomer) {
      await updateCustomer(customer.id, customer);
    } else {
      await addCustomer(customer);
    }
    setSelectedCustomer(null);
  }

  function handleModalClose() {
    setSelectedCustomer(null);
    setIsModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-500 mt-1">Track customer purchase history and total spend.</p>
        </div>

        {canAddCustomer ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition"
          >
            <Plus size={18} /> Add Customer
          </button>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Read-only customer access
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center bg-gray-100 px-4 py-3 rounded-lg">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none ml-2 w-full"
          />
        </div>
      </div>

      <CustomerTable
        customers={filteredCustomers}
        orders={orders}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canEdit={canAddCustomer}
        canDelete={canAddCustomer}
      />

      <AddCustomerModal
        isOpen={isModalOpen}
        setIsOpen={handleModalClose}
        onSaveCustomer={handleSaveCustomer}
        customerToEdit={selectedCustomer}
      />
    </div>
  );
}

export default Customers;
