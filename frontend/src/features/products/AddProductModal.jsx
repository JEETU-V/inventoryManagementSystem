import { useState } from "react";

const emptyForm = {
  supplierId: "",
  name: "",
  sku: "",
  category: "",
  purchasePrice: "",
  quantity: "",
  price: "",
  reorderLevel: "10",
};

function AddProductModal({ isOpen, setIsOpen, onSaveProduct, productToEdit, suppliers }) {
  const [formData, setFormData] = useState(() => productToEdit ? {
    supplierId: productToEdit.supplierId ? String(productToEdit.supplierId) : "",
    name: productToEdit.name,
    sku: productToEdit.sku,
    category: productToEdit.category || "",
    purchasePrice: String(productToEdit.purchasePrice ?? ""),
    quantity: String(productToEdit.quantity),
    price: String(productToEdit.price),
    reorderLevel: String(productToEdit.reorderLevel ?? 10),
  } : emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setFormError("");
  }

  function validateForm() {
    const errors = {};
    const name = formData.name.trim();
    const sku = formData.sku.trim();
    const purchasePrice = Number(formData.purchasePrice);
    const price = Number(formData.price);
    const quantity = Number(formData.quantity);
    const reorderLevel = Number(formData.reorderLevel);

    if (!name) errors.name = "Enter a product name.";
    else if (name.length > 160) errors.name = "Product name must be 160 characters or fewer.";
    if (!sku) errors.sku = "Enter a SKU or product code.";
    else if (sku.length > 80) errors.sku = "SKU must be 80 characters or fewer.";
    const validMoney = (value, amount) =>
      /^\d+(?:\.\d{1,2})?$/.test(value.trim()) &&
      Number.isFinite(amount) &&
      amount >= 0 &&
      amount <= 9999999999.99;
    if (!validMoney(formData.purchasePrice, purchasePrice)) {
      errors.purchasePrice = "Enter a price from 0 to ₹9,999,999,999.99, using up to 2 decimal places.";
    }
    if (!validMoney(formData.price, price)) {
      errors.price = "Enter a price from 0 to ₹9,999,999,999.99, using up to 2 decimal places.";
    }
    if (!formData.quantity.trim() || !Number.isInteger(quantity) || quantity < 0) {
      errors.quantity = "Quantity must be a whole number of 0 or more.";
    }
    if (!formData.reorderLevel.trim() || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
      errors.reorderLevel = "Reorder level must be a whole number of 0 or more.";
    }
    if (formData.category.trim().length > 120) {
      errors.category = "Category must be 120 characters or fewer.";
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateForm();
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    const product = {
      ...(productToEdit ? { id: productToEdit.id } : {}),
      supplierId: Number(formData.supplierId) || null,
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      category: formData.category.trim(),
      purchasePrice: Number(formData.purchasePrice),
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      reorderLevel: Number(formData.reorderLevel),
    };

    setIsSaving(true);
    try {
      await onSaveProduct(product);
      setIsOpen(false);
    } catch (error) {
      const details = error.response?.data?.details;
      if (details && typeof details === "object") {
        const messages = Object.fromEntries(
          Object.entries(details).map(([field, messages]) => [
            field,
            Array.isArray(messages) ? messages.join(" ") : String(messages),
          ])
        );
        setFieldErrors(messages);
      }
      setFormError(error.response?.data?.message || "Unable to save product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function fieldClass(name) {
    return `mt-1 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 ${
      fieldErrors[name] ? "border-red-400" : "border-gray-200"
    }`;
  }

  function fieldError(name) {
    return fieldErrors[name] ? <p className="mt-1 text-sm text-red-700">{fieldErrors[name]}</p> : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          {productToEdit ? "Edit Product" : "Add New Product"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {formError}
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700">
            Product name
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              maxLength={160}
              autoComplete="off"
              className={fieldClass("name")}
              aria-invalid={Boolean(fieldErrors.name)}
              required
            />
            {fieldError("name")}
          </label>

          <label className="block text-sm font-medium text-gray-700">
            SKU / product code
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              maxLength={80}
              autoComplete="off"
              className={fieldClass("sku")}
              aria-invalid={Boolean(fieldErrors.sku)}
              required
            />
            {fieldError("sku")}
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Supplier <span className="font-normal text-gray-500">(optional)</span>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              className={fieldClass("supplierId")}
            >
              <option value="">No supplier selected</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            {fieldError("supplierId")}
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Category <span className="font-normal text-gray-500">(optional)</span>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              maxLength={120}
              className={fieldClass("category")}
              aria-invalid={Boolean(fieldErrors.category)}
            />
            {fieldError("category")}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Purchase price (₹)
              <input
                type="number"
                name="purchasePrice"
                min="0"
                step="0.01"
                value={formData.purchasePrice}
                onChange={handleChange}
                className={fieldClass("purchasePrice")}
                aria-invalid={Boolean(fieldErrors.purchasePrice)}
                required
              />
              {fieldError("purchasePrice")}
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Selling price (₹)
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                className={fieldClass("price")}
                aria-invalid={Boolean(fieldErrors.price)}
                required
              />
              {fieldError("price")}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {productToEdit ? (
              <div className="text-sm font-medium text-gray-700">
                Current quantity
                <p className="mt-1 rounded-lg border bg-gray-50 px-4 py-3 text-gray-600">
                  {formData.quantity} units
                </p>
                <p className="mt-1 text-xs font-normal text-gray-500">Use Inventory → Adjust stock to record quantity changes.</p>
              </div>
            ) : (
              <label className="block text-sm font-medium text-gray-700">
                Opening quantity
                <input
                  type="number"
                  name="quantity"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={fieldClass("quantity")}
                  aria-invalid={Boolean(fieldErrors.quantity)}
                  required
                />
                {fieldError("quantity")}
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Low-stock alert level
              <input
                type="number"
                name="reorderLevel"
                min="0"
                step="1"
                value={formData.reorderLevel}
                onChange={handleChange}
                className={fieldClass("reorderLevel")}
                aria-invalid={Boolean(fieldErrors.reorderLevel)}
                required
              />
              {fieldError("reorderLevel")}
            </label>
          </div>
          <p className="-mt-2 text-xs text-gray-500">
            You’ll see a low-stock alert when the quantity reaches this level.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
              className="rounded-lg bg-gray-200 px-5 py-2 transition hover:bg-gray-300 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : productToEdit ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProductModal;
