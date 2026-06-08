export function parseAmount(value) {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

export function getOrderItems(order) {
  if (Array.isArray(order.items)) {
    return order.items;
  }

  const quantity = Number(order.quantity) || 1;
  const totalPrice = order.totalPrice || "₹0";
  const total = parseAmount(totalPrice);
  const unitPrice = quantity ? total / quantity : 0;
  const unitPriceValue = `₹${unitPrice.toLocaleString("en-IN")}`;

  return [
    {
      productId: order.productId ?? null,
      productName: order.productName ?? "Unknown product",
      supplierId: order.supplierId ?? null,
      unitPrice: order.unitPrice || order.price || unitPriceValue,
      quantity,
      discount: Number(order.discount) || 0,
      totalPrice,
    },
  ];
}

export function getOrderQuantity(order) {
  const items = getOrderItems(order);
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function normalizeLegacyOrder(order) {
  if (Array.isArray(order.items)) {
    return order;
  }

  const normalizedItems = getOrderItems(order);
  return {
    ...order,
    items: normalizedItems,
    totalQuantity: getOrderQuantity(order),
    totalPrice: order.totalPrice || normalizedItems.reduce(
      (sum, item) => sum + parseAmount(item.totalPrice),
      0
    ),
  };
}
