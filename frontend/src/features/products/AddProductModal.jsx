import { useEffect, useState } from "react";

function AddProductModal({ isOpen, setIsOpen, onSaveProduct, productToEdit, suppliers }) {
  const [formData, setFormData] = useState({
    supplierId: "",
    name: "",
    sku: "",
    category: "",
    purchasePrice: "",
    quantity: "",
    price: "",
    reorderLevel: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({ supplierId: "", name: "", sku: "", category: "", purchasePrice: "", quantity: "", price: "", reorderLevel: "" });
      return;
    }

    if (productToEdit) {
      setFormData({
        supplierId: productToEdit.supplierId ? String(productToEdit.supplierId) : "",
        name: productToEdit.name,
        sku: productToEdit.sku,
        category: productToEdit.category,
        purchasePrice: productToEdit.purchasePrice || "",
        quantity: String(productToEdit.quantity),
        price: productToEdit.price,
        reorderLevel: String(productToEdit.reorderLevel || 10),
      });
    }
  }, [isOpen, productToEdit]);

  if (!isOpen) return null;

  function handleChange(e) {
    const value = e.target.name === "quantity" || e.target.name === "reorderLevel" ? e.target.value.replace(/\D/g, "") : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  }

  function handleSubmit(e) {
    e.preventDefault();

    const product = {
      id: productToEdit ? productToEdit.id : Date.now(),
      supplierId: Number(formData.supplierId) || null,
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      purchasePrice: formData.purchasePrice,
      quantity: Number(formData.quantity),
      price: formData.price,
      reorderLevel: Number(formData.reorderLevel),
    };

    onSaveProduct(product);
    setIsOpen(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {productToEdit ? "Edit Product" : "Add New Product"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Product Name"
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="SKU"
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <select
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers?.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Category"
            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              placeholder="Purchase Price (₹)"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Sell Price (e.g. ₹45)"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              min="0"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="Quantity"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min="0"
              name="reorderLevel"
              value={formData.reorderLevel}
              onChange={handleChange}
              placeholder="Reorder level"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="flex items-center justify-center text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 px-4 py-3">
              Enter reorder level to receive alerts when stock is low.
            </div>
          </div>

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
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProductModal;
