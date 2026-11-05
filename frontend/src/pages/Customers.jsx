import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAppData } from "../contexts/useAppData";
import CustomerTable from "../features/customers/CustomerTable";
import AddCustomerModal from "../features/customers/AddCustomerModal";

function Customers() {
  const { canAddCustomer, canDeleteCustomers, customers, orders, addCustomer, updateCustomer, deleteCustomer, activateCustomerPortal, activeBusiness } =
    useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pageError, setPageError] = useState("");
  const [portalCredentials, setPortalCredentials] = useState(null);

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
    const customer = customers.find((item) => item.id === customerId);
    if (!window.confirm(`Delete "${customer?.name || "this customer"}"? This cannot be undone.`)) return;
    setPageError("");
    try {
      await deleteCustomer(customerId);
    } catch (error) {
      setPageError(error.response?.data?.message || "Unable to delete customer. Please try again.");
    }
  }

  async function handleSaveCustomer(customer) {
    setPageError("");
    if (selectedCustomer) {
      await updateCustomer(customer.id, customer);
    } else {
      await addCustomer(customer);
    }
    setSelectedCustomer(null);
  }

  async function handleActivatePortal(customer) {
    setPageError("");
    try {
      const result = await activateCustomerPortal(customer.id);
      setPortalCredentials({
        name: customer.name,
        email: customer.email,
        businessSlug: activeBusiness.slug,
        password: result.temporaryPassword,
      });
    } catch (error) {
      setPageError(error.response?.data?.message || "Unable to activate customer portal access.");
    }
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

        {pageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{pageError}</p>}

        {canAddCustomer ? (
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setIsModalOpen(true);
            }}
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
        onActivatePortal={canDeleteCustomers ? handleActivatePortal : undefined}
        canEdit={canAddCustomer}
        canDelete={canDeleteCustomers}
      />

      {isModalOpen && (
        <AddCustomerModal
          isOpen={isModalOpen}
          setIsOpen={handleModalClose}
          onSaveCustomer={handleSaveCustomer}
          customerToEdit={selectedCustomer}
        />
      )}
      {portalCredentials && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="portal-access-title">
            <h2 id="portal-access-title" className="text-xl font-semibold text-slate-900">Portal access activated</h2>
            <p className="mt-2 text-sm text-slate-600">Share these sign-in details with {portalCredentials.name}. The customer will be asked to change the temporary password after signing in.</p>
            <dl className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div><dt className="font-medium text-slate-500">Portal</dt><dd className="break-all text-slate-900">{window.location.origin}/portal/login</dd></div>
              <div><dt className="font-medium text-slate-500">Business workspace</dt><dd className="text-slate-900">{portalCredentials.businessSlug}</dd></div>
              <div><dt className="font-medium text-slate-500">Email</dt><dd className="text-slate-900">{portalCredentials.email}</dd></div>
              <div><dt className="font-medium text-slate-500">Temporary password</dt><dd className="break-all font-mono text-slate-900">{portalCredentials.password}</dd></div>
            </dl>
            <button type="button" className="mt-5 w-full rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900" onClick={() => setPortalCredentials(null)}>Done</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Customers;
