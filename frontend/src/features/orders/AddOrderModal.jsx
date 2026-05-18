import { useEffect, useMemo, useState } from "react";

function AddOrderModal({ isOpen, setIsOpen, products, customers, onAddOrder }) {
  const [formData, setFormData] = useState({
    customerId: "",
    productId: "",
    quantity: 1,
    discount: 0,
    status: "Pending",
  });
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormData({ customerId: "", productId: "", quantity: 1, discount: 0, status: "Pending" });
      setCustomerQuery("");
      setProductQuery("");
    }
  }, [isOpen]);

  const selectedProduct = products.find((product) => product.id === Number(formData.productId));
  const selectedCustomer = customers.find((customer) => customer.id === Number(formData.customerId));

  useEffect(() => {
    if (selectedCustomer && customerQuery !== selectedCustomer.name) {
      setFormData((prev) => ({ ...prev, customerId: "" }));
    }
  }, [customerQuery, selectedCustomer]);

  useEffect(() => {
    if (selectedProduct && productQuery !== selectedProduct.name) {
      setFormData((prev) => ({ ...prev, productId: "" }));
    }
  }, [productQuery, selectedProduct]);

  const showCustomerSuggestions = customerQuery.length > 0 && (!selectedCustomer || selectedCustomer.name !== customerQuery);
  const showProductSuggestions = productQuery.length > 0 && (!selectedProduct || selectedProduct.name !== productQuery);

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
    if (!selectedProduct) return "₹0";
    const price = parseAmount(selectedProduct.price);
    const quantity = Number(formData.quantity);
    const discount = Number(formData.discount) || 0;
    const discountedPrice = price * (1 - discount / 100);
    const total = discountedPrice * quantity;
    return `₹${total.toLocaleString("en-IN")}`;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "quantity"
          ? Number(value)
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
    setFormData((prev) => ({ ...prev, productId: product.id }));
    setProductQuery(product.name);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!selectedCustomer || !selectedProduct) return;

    const newOrder = {
      id: Date.now(),
      orderNumber: `ORD-${Date.now().toString().slice(-5)}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      supplierId: selectedProduct.supplierId ?? null,
      quantity: Number(formData.quantity),
      discount: Number(formData.discount) || 0,
      totalPrice: getTotal(),
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
              required
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
              value={formData.quantity}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Quantity"
              required
            />

            <input
              type="number"
              name="discount"
              min={0}
              max={100}
              value={formData.discount}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Discount %"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Order summary</p>
            <p className="mt-2 text-lg font-semibold">Total: {getTotal()}</p>
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
