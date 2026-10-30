import { useState } from "react";

function AddCustomerModal({ isOpen, setIsOpen, onSaveCustomer, customerToEdit }) {
  const [formData, setFormData] = useState(() => customerToEdit
    ? {
        name: customerToEdit.name,
        phone: customerToEdit.phone,
        email: customerToEdit.email,
        address: customerToEdit.address,
      }
    : { name: "", phone: "", email: "", address: "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onSaveCustomer(customerToEdit ? { ...customerToEdit, ...formData } : formData);
      setIsOpen(false);
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to save customer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {customerToEdit ? "Edit Customer" : "Add New Customer"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Customer Name"
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone"
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Address"
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-60"
            >
              {isSaving ? "Saving..." : customerToEdit ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCustomerModal;
