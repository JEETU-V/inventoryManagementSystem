import { useEffect, useState } from "react";

function AddSupplierTransactionModal({
  isOpen,
  setIsOpen,
  suppliers,
  products,
  onAddSupplierTransaction,
}) {
  const [formData, setFormData] = useState({
    supplierId: "",
    productId: "",
    quantity: 1,
    totalCost: "",
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({ supplierId: "", productId: "", quantity: 1, totalCost: "", date: new Date().toISOString().slice(0, 10) });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const availableProducts = products.filter(
    (product) => !formData.supplierId || product.supplierId === Number(formData.supplierId)
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Number(value) : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const supplier = suppliers.find((supplier) => supplier.id === Number(formData.supplierId));
    const product = products.find((product) => product.id === Number(formData.productId));
    if (!supplier || !product) return;

    onAddSupplierTransaction({
      id: Date.now(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: product.id,
      productName: product.name,
      quantity: Number(formData.quantity),
      totalCost: formData.totalCost.startsWith("₹") ? formData.totalCost : `₹${formData.totalCost}`,
      date: formData.date,
    });
    setIsOpen(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Record Supplier Purchase</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <select
            name="productId"
            value={formData.productId}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Product</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — {product.sku}
              </option>
            ))}
          </select>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              name="quantity"
              min={1}
              value={formData.quantity}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Quantity Purchased"
              required
            />
            <input
              type="text"
              name="totalCost"
              value={formData.totalCost}
              onChange={handleChange}
              placeholder="Total Cost (₹)"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Save Purchase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSupplierTransactionModal;
