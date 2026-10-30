import { useMemo, useState } from "react";
import { X } from "lucide-react";

function AddOrderModal({ isOpen, setIsOpen, products, customers, onAddCustomer, onAddOrder }) {
  const [formData, setFormData] = useState({
    customerId: "",
  });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [lineItem, setLineItem] = useState({
    productId: "",
    quantity: 1,
    discount: 0,
  });
  const [orderItems, setOrderItems] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [orderError, setOrderError] = useState("");

  const selectedLineProduct = products.find((product) => product.id === Number(lineItem.productId));
  const selectedCustomer = customers.find((customer) => customer.id === Number(formData.customerId));

  const showCustomerSuggestions =
    !isCreatingCustomer &&
    customerQuery.length > 0 &&
    (!selectedCustomer || selectedCustomer.name !== customerQuery);
  const showProductSuggestions =
    productQuery.length > 0 && (!selectedLineProduct || selectedLineProduct.name !== productQuery);

  const customerMatches = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.email.toLowerCase().includes(query)
    );
  }, [customerQuery, customers]);

  const productMatches = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [productQuery, products]);

  function handleClose() {
    setFormData({ customerId: "" });
    setNewCustomer({ name: "", phone: "", email: "", address: "" });
    setLineItem({ productId: "", quantity: 1, discount: 0 });
    setOrderItems([]);
    setCustomerQuery("");
    setProductQuery("");
    setIsCreatingCustomer(false);
    setIsSavingCustomer(false);
    setIsSubmitting(false);
    setCustomerError("");
    setOrderError("");
    setIsOpen(false);
  }

  function parseAmount(price) {
    return Number(String(price).replace(/[^0-9.-]/g, "")) || 0;
  }

  function getTotal() {
    if (orderItems.length === 0) return "₹0";
    const total = orderItems.reduce(
      (sum, item) => sum + parseAmount(item.totalPrice),
      0
    );
    return `₹${total.toLocaleString("en-IN")}`;
  }

  function handleLineChange(event) {
    const { name, value } = event.target;
    setOrderError("");
    setLineItem((prev) => ({
      ...prev,
      [name]:
        name === "quantity"
          ? Math.max(1, Math.floor(Number(value) || 1))
          : name === "discount"
          ? Math.max(0, Math.min(100, Number(value)))
          : value,
    }));
  }

  function handleSelectCustomer(customer) {
    setFormData((prev) => ({ ...prev, customerId: customer.id }));
    setCustomerQuery(customer.name);
    setIsCreatingCustomer(false);
    setCustomerError("");
  }

  function handleSelectProduct(product) {
    setLineItem((prev) => ({ ...prev, productId: product.id }));
    setProductQuery(product.name);
  }

  function handleAddItem() {
    if (!selectedLineProduct || !lineItem.quantity) return;
    setOrderError("");

    const lineTotal = parseAmount(selectedLineProduct.price) * lineItem.quantity * (1 - lineItem.discount / 100);
    const nextItem = {
      productId: selectedLineProduct.id,
      productName: selectedLineProduct.name,
      supplierId: selectedLineProduct.supplierId ?? null,
      unitPrice: selectedLineProduct.price,
      quantity: lineItem.quantity,
      discount: lineItem.discount,
      totalPrice: `₹${lineTotal.toLocaleString("en-IN")}`,
    };

    setOrderItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === nextItem.productId && item.discount === nextItem.discount
      );
      if (existingIndex >= 0) {
        const nextItems = [...prev];
        const merged = nextItems[existingIndex];
        merged.quantity += nextItem.quantity;
        merged.totalPrice = `₹${(
          parseAmount(merged.unitPrice) * merged.quantity * (1 - merged.discount / 100)
        ).toLocaleString("en-IN")}`;
        nextItems[existingIndex] = merged;
        return nextItems;
      }
      return [...prev, nextItem];
    });

    setLineItem({ productId: "", quantity: 1, discount: 0 });
    setProductQuery("");
  }

  function handleRemoveItem(productId, discount) {
    setOrderError("");
    setOrderItems((prev) => prev.filter((item) => !(item.productId === productId && item.discount === discount)));
  }

  async function handleCreateCustomer(event) {
    event.preventDefault();
    setCustomerError("");
    setIsSavingCustomer(true);

    try {
      const createdCustomer = await onAddCustomer({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim(),
        address: newCustomer.address.trim(),
      });
      setFormData({ customerId: createdCustomer.id });
      setCustomerQuery(createdCustomer.name);
      setNewCustomer({ name: "", phone: "", email: "", address: "" });
      setIsCreatingCustomer(false);
    } catch (error) {
      setCustomerError(error.response?.data?.message || "Unable to create customer. Please try again.");
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedCustomer || orderItems.length === 0) return;

    setOrderError("");
    setIsSubmitting(true);
    try {
      await onAddOrder({
        customerId: selectedCustomer.id,
        items: orderItems,
      });
      handleClose();
    } catch (error) {
      setOrderError(error.response?.data?.message || "Unable to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Create New Order</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSavingCustomer || isSubmitting}
            aria-label="Close new order"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setFormData((prev) => ({ ...prev, customerId: "" }));
                setIsCreatingCustomer(false);
              }}
              placeholder="Search customer by name, phone, or email"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showCustomerSuggestions && (
              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-xl border bg-white shadow-lg">
                {customerMatches.length > 0 ? customerMatches.map((customer) => (
                    <button
                      type="button"
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.phone} • {customer.email}</div>
                    </button>
                  )) : (
                    <p className="px-4 py-3 text-sm text-gray-500">No matching customer found.</p>
                  )}
                <button
                  type="button"
                  onClick={() => {
                    setNewCustomer((prev) => ({ ...prev, name: customerQuery.trim() }));
                    setIsCreatingCustomer(true);
                    setCustomerError("");
                  }}
                  className="w-full border-t px-4 py-3 text-left text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  + Create a new customer
                </button>
              </div>
            )}
          </div>

          {isCreatingCustomer && (
            <form onSubmit={handleCreateCustomer} className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <h3 className="font-semibold text-gray-800">Customer details</h3>
              <input
                type="text"
                value={newCustomer.name}
                onChange={(event) => setNewCustomer((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Customer name"
                aria-label="Customer name"
                autoComplete="name"
                className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone number"
                  aria-label="Phone number"
                  autoComplete="tel"
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email address"
                  aria-label="Email address"
                  autoComplete="email"
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <textarea
                value={newCustomer.address}
                onChange={(event) => setNewCustomer((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Address"
                aria-label="Address"
                autoComplete="street-address"
                rows={2}
                className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {customerError && <p role="alert" className="text-sm text-red-700">{customerError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingCustomer(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                  disabled={isSavingCustomer}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {isSavingCustomer ? "Saving customer..." : "Save customer and continue"}
                </button>
              </div>
            </form>
          )}

          {selectedCustomer ? (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Order for <strong>{selectedCustomer.name}</strong>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <input
              type="text"
              value={productQuery}
              onChange={(e) => {
                setProductQuery(e.target.value);
                setLineItem((prev) => ({ ...prev, productId: "" }));
              }}
              placeholder="Search product by name, SKU, or category"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showProductSuggestions && (
              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-xl border bg-white shadow-lg">
                {productMatches.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50"
                  >
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.sku} • {product.category} • {product.quantity} in stock</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Quantity
              <input
                type="number"
                name="quantity"
                min={1}
                value={lineItem.quantity}
                onChange={handleLineChange}
                className="mt-2 w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Discount (%)
              <input
                type="number"
                name="discount"
                min={0}
                max={100}
                step="0.01"
                value={lineItem.discount}
                onChange={handleLineChange}
                className="mt-2 w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                aria-describedby="discount-help"
              />
              <span id="discount-help" className="mt-1 block text-xs font-normal text-gray-500">
                Percentage off this product's unit price (0-100%).
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="text-sm text-gray-600">
              {selectedLineProduct ? (
                <span>{selectedLineProduct.name} • {selectedLineProduct.quantity} in stock</span>
              ) : (
                <span>Select a product to add to the order.</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-5 py-3 hover:bg-blue-700 transition"
            >
              Add Item
            </button>
          </div>

          {orderItems.length > 0 && (
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800">Order Items</h3>
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div key={`${item.productId}-${item.discount}`} className="rounded-xl border bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">{item.productName}</p>
                        <p className="text-sm text-gray-500">
                          Qty {item.quantity} • {item.discount}% discount
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">{item.totalPrice}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId, item.discount)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Order summary</p>
            <p className="mt-2 text-lg font-semibold">Total: {getTotal()}</p>
            <p className="text-sm text-gray-500 mt-1">{orderItems.length} item{orderItems.length === 1 ? "" : "s"} added.</p>
          </div>

          {orderError && <p role="alert" className="text-sm text-red-700">{orderError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || orderItems.length === 0}
              className="px-5 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-60"
            >
              {isSubmitting ? "Placing order..." : "Place Order"}
            </button>
          </div>
          </form>
          ) : !isCreatingCustomer && (
            <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Select an existing customer or create a new one to continue with the order.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddOrderModal;
