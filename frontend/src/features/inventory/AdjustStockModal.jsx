import { useState } from "react";

function AdjustStockModal({ isOpen, onClose, products, onSave }) {
  const [formData, setFormData] = useState({
    productId: "",
    transactionType: "stock_in",
    quantity: "1",
    reason: "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const quantity = Number(formData.quantity);
    if (!formData.productId || !Number.isInteger(quantity) || quantity <= 0) {
      setError("Choose a product and enter a whole quantity greater than zero.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await onSave({ ...formData, quantity });
      setFormData({ productId: "", transactionType: "stock_in", quantity: "1", reason: "" });
      onClose();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to update stock. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-5 text-xl font-semibold text-gray-800">Adjust stock</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700">
            Product
            <select
              value={formData.productId}
              onChange={(event) => setFormData((previous) => ({ ...previous, productId: event.target.value }))}
              className="mt-1 w-full rounded-lg border px-4 py-3"
              required
            >
              <option value="">Choose a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.quantity} currently in stock)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Stock movement
            <select
              value={formData.transactionType}
              onChange={(event) => setFormData((previous) => ({ ...previous, transactionType: event.target.value }))}
              className="mt-1 w-full rounded-lg border px-4 py-3"
            >
              <option value="stock_in">Add stock received</option>
              <option value="stock_out">Remove stock / correction</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              value={formData.quantity}
              onChange={(event) => setFormData((previous) => ({ ...previous, quantity: event.target.value }))}
              className="mt-1 w-full rounded-lg border px-4 py-3"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Reason
            <input
              type="text"
              maxLength={255}
              value={formData.reason}
              onChange={(event) => setFormData((previous) => ({ ...previous, reason: event.target.value }))}
              className="mt-1 w-full rounded-lg border px-4 py-3"
              placeholder="For example: opening count correction"
              required
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg bg-gray-100 px-4 py-2">
              Close
            </button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-60">
              {isSaving ? "Saving..." : "Save stock movement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdjustStockModal;
