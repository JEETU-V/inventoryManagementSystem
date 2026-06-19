import axios from "axios";

const TOKEN_KEY = "ims-access-token";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://inventorymanagementsystem-4nb4.onrender.com/api",
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function parseAmount(value) {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

export function setAccessToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function loginRequest(credentials) {
  const { data } = await apiClient.post("/auth/login", credentials);
  setAccessToken(data.accessToken);
  return data.user;
}

export async function logoutRequest() {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

export async function meRequest() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function loadAppData() {
  const [products, suppliers, customers, orders, supplierTransactions] = await Promise.all([
    apiClient.get("/products"),
    apiClient.get("/suppliers"),
    apiClient.get("/customers"),
    apiClient.get("/orders"),
    apiClient.get("/suppliers/transactions"),
  ]);

  return {
    products: products.data,
    suppliers: suppliers.data,
    customers: customers.data,
    orders: orders.data,
    supplierTransactions: supplierTransactions.data,
  };
}

export const productApi = {
  create(product) {
    return apiClient
      .post("/products", {
        supplierId: product.supplierId,
        name: product.name,
        sku: product.sku,
        category: product.category,
        purchasePrice: parseAmount(product.purchasePrice),
        quantity: Number(product.quantity),
        price: parseAmount(product.price),
        reorderLevel: Number(product.reorderLevel),
      })
      .then((response) => response.data);
  },
  update(productId, product) {
    return apiClient
      .put(`/products/${productId}`, {
        supplierId: product.supplierId,
        name: product.name,
        sku: product.sku,
        category: product.category,
        purchasePrice: parseAmount(product.purchasePrice),
        quantity: Number(product.quantity),
        price: parseAmount(product.price),
        reorderLevel: Number(product.reorderLevel),
      })
      .then((response) => response.data);
  },
  delete(productId) {
    return apiClient.delete(`/products/${productId}`);
  },
};

export const supplierApi = {
  create(supplier) {
    return apiClient
      .post("/suppliers", {
        name: supplier.name,
        contact: supplier.contact,
        email: supplier.email,
        productsSupplied: supplier.productsSupplied,
      })
      .then((response) => response.data);
  },
  update(supplierId, supplier) {
    return apiClient
      .put(`/suppliers/${supplierId}`, {
        name: supplier.name,
        contact: supplier.contact,
        email: supplier.email,
        productsSupplied: supplier.productsSupplied,
      })
      .then((response) => response.data);
  },
  delete(supplierId) {
    return apiClient.delete(`/suppliers/${supplierId}`);
  },
  createTransaction(transaction) {
    return apiClient
      .post("/suppliers/transactions", {
        supplierId: transaction.supplierId,
        productId: transaction.productId,
        quantity: Number(transaction.quantity),
        totalCost: parseAmount(transaction.totalCost),
        date: transaction.date,
      })
      .then((response) => response.data);
  },
};

export const customerApi = {
  create(customer) {
    return apiClient
      .post("/customers", {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
      })
      .then((response) => response.data);
  },
  update(customerId, customer) {
    return apiClient
      .put(`/customers/${customerId}`, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
      })
      .then((response) => response.data);
  },
  delete(customerId) {
    return apiClient.delete(`/customers/${customerId}`);
  },
};

export const orderApi = {
  create(order) {
    return apiClient
      .post("/orders", {
        customerId: order.customerId,
        status: order.status,
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          discount: Number(item.discount || 0),
        })),
      })
      .then((response) => response.data);
  },
  update(orderId, updates) {
    return apiClient.put(`/orders/${orderId}`, updates).then((response) => response.data);
  },
  cancel(orderId) {
    return apiClient.post(`/orders/${orderId}/cancel`).then((response) => response.data);
  },
};

export async function fetchDashboardSummary() {
  const { data } = await apiClient.get("/dashboard/summary");
  return data;
}
