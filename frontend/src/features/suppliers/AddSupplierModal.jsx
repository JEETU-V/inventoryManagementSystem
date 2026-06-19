import { useEffect, useState } from "react";

function AddSupplierModal({ isOpen, setIsOpen, onSaveSupplier, supplierToEdit }) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    productsSupplied: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: "", contact: "", email: "", productsSupplied: "" });
      return;
    }

    if (supplierToEdit) {
      setFormData({
        name: supplierToEdit.name,
        contact: supplierToEdit.contact,
        email: supplierToEdit.email,
        productsSupplied: supplierToEdit.productsSupplied,
      });
    }
  }, [isOpen, supplierToEdit]);

  if (!isOpen) return null;

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSaveSupplier(supplierToEdit ? { ...supplierToEdit, ...formData } : formData);
    setIsOpen(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {supplierToEdit ? "Edit Supplier" : "Add New Supplier"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Supplier Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="tel"
            name="contact"
            placeholder="Contact Number"
            value={formData.contact}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <textarea
            name="productsSupplied"
            placeholder="Products Supplied"
            value={formData.productsSupplied}
            onChange={handleChange}
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
              className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              {supplierToEdit ? "Save Changes" : "Add Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSupplierModal;
