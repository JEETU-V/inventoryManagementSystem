import { useEffect, useMemo, useState } from "react";

function AddOrderModal({ isOpen, setIsOpen, products, customers, onAddOrder }) {
  const [formData, setFormData] = useState({
    customerId: "",
    status: "Pending",
  });
  const [lineItem, setLineItem] = useState({
    productId: "",
    quantity: 1,
    discount: 0,
  });
  const [orderItems, setOrderItems] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormData({ customerId: "", status: "Pending" });
      setLineItem({ productId: "", quantity: 1, discount: 0 });
      setOrderItems([]);
      setCustomerQuery("");
      setProductQuery("");
    }
  }, [isOpen]);

  const selectedLineProduct = products.find((product) => product.id === Number(lineItem.productId));
  const selectedCustomer = customers.find((customer) => customer.id === Number(formData.customerId));

  useEffect(() => {
    if (selectedCustomer && customerQuery !== selectedCustomer.name) {
      setFormData((prev) => ({ ...prev, customerId: "" }));
    }
  }, [customerQuery, selectedCustomer]);

  useEffect(() => {
    if (selectedLineProduct && productQuery !== selectedLineProduct.name) {
      setLineItem((prev) => ({ ...prev, productId: "" }));
    }
  }, [productQuery, selectedLineProduct]);

  const showCustomerSuggestions =
    customerQuery.length > 0 && (!selectedCustomer || selectedCustomer.name !== customerQuery);
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

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleLineChange(event) {
    const { name, value } = event.target;
    setLineItem((prev) => ({
      ...prev,
      [name]:
        name === "quantity"
          ? Math.max(1, Number(value))
          : name === "discount"
          ? Math.max(0, Math.min(100, Number(value)))
          : value,
    }));
  }

  function handleSelectCustomer(customer) {
    setFormData((prev) => ({ ...prev, customerId: customer.id }));
    setCustomerQuery(customer.name);
  }

  function handleSelectProduct(product) {
    setLineItem((prev) => ({ ...prev, productId: product.id }));
    setProductQuery(product.name);
  }

  function handleAddItem() {
    if (!selectedLineProduct || !lineItem.quantity) return;

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
    setOrderItems((prev) => prev.filter((item) => !(item.productId === productId && item.discount === discount)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!selectedCustomer || orderItems.length === 0) return;

    const total = orderItems.reduce((sum, item) => sum + parseAmount(item.totalPrice), 0);
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    const newOrder = {
      id: Date.now(),
      orderNumber: `ORD-${Date.now().toString().slice(-5)}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      items: orderItems,
      totalQuantity,
      totalPrice: `₹${total.toLocaleString("en-IN")}`,
      status: formData.status,
      date: new Date().toISOString().slice(0, 10),
    };

    onAddOrder(newOrder);
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Order</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search customer by name, phone, or email"
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {showCustomerSuggestions && (
              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-xl border bg-white shadow-lg">
                {customerMatches.map((customer) => (
                  <button
                    type="button"
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50"
                  >
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.phone} • {customer.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
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
            <input
              type="number"
              name="quantity"
              min={1}
              value={lineItem.quantity}
              onChange={handleLineChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Quantity"
            />

            <input
              type="number"
              name="discount"
              min={0}
              max={100}
              value={lineItem.discount}
              onChange={handleLineChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Discount %"
            />
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

          <div className="grid gap-4 md:grid-cols-2">
            <select
              name="status"
              value={formData.status}
              onChange={handleFormChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
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
              className="px-5 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
            >
              Place Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddOrderModal;
