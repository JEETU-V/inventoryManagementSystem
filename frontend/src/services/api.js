import axios from "axios";
import { attachApiErrorHandling } from "./apiErrors";

const TOKEN_KEY = "ims-access-token";
const BUSINESS_KEY = "ims-business-id";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

attachApiErrorHandling(apiClient, (error) => {
  const requestUrl = error.config?.url || "";
  if (/\/auth\/(login|platform-login|register)$/.test(requestUrl)) return;
  setAccessToken(null);
  setActiveBusinessId(null);
  window.dispatchEvent(new Event("ims:session-expired"));
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const businessId = sessionStorage.getItem(BUSINESS_KEY);
  if (businessId) {
    config.headers["X-Business-Id"] = businessId;
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

export function getActiveBusinessId() {
  return sessionStorage.getItem(BUSINESS_KEY);
}

export function setActiveBusinessId(businessId) {
  if (businessId) {
    sessionStorage.setItem(BUSINESS_KEY, String(businessId));
  } else {
    sessionStorage.removeItem(BUSINESS_KEY);
  }
}

export async function loginRequest(credentials) {
  const { data } = await apiClient.post("/auth/login", credentials);
  setAccessToken(data.accessToken);
  setActiveBusinessId(data.user.businesses?.[0]?.id);
  return data.user;
}

export async function platformAdminLoginRequest(credentials) {
  const { data } = await apiClient.post("/auth/platform-login", credentials);
  setAccessToken(data.accessToken);
  setActiveBusinessId(null);
  return data.user;
}

export async function registerRequest(details) {
  const { data } = await apiClient.post("/auth/register", details);
  setAccessToken(data.accessToken);
  setActiveBusinessId(data.business.id);
  return data.user;
}

export async function logoutRequest() {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    setAccessToken(null);
    setActiveBusinessId(null);
  }
}

export async function meRequest() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export const businessApi = {
  async create(business) {
    const { data } = await apiClient.post("/businesses", business);
    return data;
  },
};

export const shopOwnerApi = {
  async resolve(slug) {
    const { data } = await apiClient.get(`/shops/${encodeURIComponent(slug)}/owner`);
    return data;
  },
  async getStorefrontSettings(slug) {
    const { data } = await apiClient.get(`/shops/${encodeURIComponent(slug)}/storefront/settings`);
    return data;
  },
  async updateStorefrontSettings(slug, settings) {
    const { data } = await apiClient.put(`/shops/${encodeURIComponent(slug)}/storefront/settings`, settings);
    return data;
  },
};

export const platformAdminApi = {
  async summary() {
    const { data } = await apiClient.get("/platform-admin/summary");
    return data;
  },
  async businesses() {
    const { data } = await apiClient.get("/platform-admin/businesses");
    return data;
  },
  async updateBusinessStatus(businessId, status) {
    const { data } = await apiClient.put(`/platform-admin/businesses/${businessId}/status`, { status });
    return data;
  },
  async assignBusinessPlan(businessId, planId) {
    const { data } = await apiClient.put(`/platform-admin/businesses/${businessId}/plan`, { planId });
    return data;
  },
  async owners() {
    const { data } = await apiClient.get("/platform-admin/owners");
    return data;
  },
  async updateOwnerStatus(userId, isActive) {
    const { data } = await apiClient.put(`/platform-admin/owners/${userId}/status`, { isActive });
    return data;
  },
  async plans() {
    const { data } = await apiClient.get("/platform-admin/plans");
    return data;
  },
  async createPlan(plan) {
    const { data } = await apiClient.post("/platform-admin/plans", plan);
    return data;
  },
  async updatePlan(planId, plan) {
    const { data } = await apiClient.put(`/platform-admin/plans/${planId}`, plan);
    return data;
  },
  async supportCases() {
    const { data } = await apiClient.get("/platform-admin/support-cases");
    return data;
  },
  async createSupportCase(supportCase) {
    const { data } = await apiClient.post("/platform-admin/support-cases", supportCase);
    return data;
  },
  async updateSupportCaseStatus(caseId, status) {
    const { data } = await apiClient.put(`/platform-admin/support-cases/${caseId}/status`, { status });
    return data;
  },
  async auditLogs() {
    const { data } = await apiClient.get("/platform-admin/audit-logs");
    return data;
  },
  async health() {
    const { data } = await apiClient.get("/platform-admin/health");
    return data;
  },
};

export async function loadAppData() {
  const [products, suppliers, customers, orders, supplierTransactions, inventoryTransactions, dashboard, sales] = await Promise.all([
    apiClient.get("/products"),
    apiClient.get("/suppliers"),
    apiClient.get("/customers"),
    apiClient.get("/orders"),
    apiClient.get("/suppliers/transactions"),
    apiClient.get("/inventory/transactions"),
    apiClient.get("/dashboard/summary"),
    apiClient.get("/sales/summary"),
  ]);

  return {
    products: products.data,
    suppliers: suppliers.data,
    customers: customers.data,
    orders: orders.data,
    supplierTransactions: supplierTransactions.data,
    inventoryTransactions: inventoryTransactions.data,
    dashboard: dashboard.data,
    sales: sales.data,
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
  async activatePortal(customerId) {
    const { data } = await apiClient.post(`/customers/${customerId}/portal-access`);
    return data;
  },
};

export const inventoryApi = {
  async listTransactions() {
    const { data } = await apiClient.get("/inventory/transactions");
    return data;
  },
  async createTransaction(transaction) {
    const { data } = await apiClient.post("/inventory/transactions", {
      productId: Number(transaction.productId),
      transactionType: transaction.transactionType,
      quantity: Number(transaction.quantity),
      reason: transaction.reason.trim(),
    });
    return data;
  },
};

export const orderApi = {
  create(order) {
    return apiClient
      .post("/orders", {
        customerId: order.customerId,
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

export const userApi = {
  async list() {
    const { data } = await apiClient.get("/users");
    return data;
  },
  async create(user) {
    const { data } = await apiClient.post("/users", user);
    return data;
  },
  async update(userId, updates) {
    const { data } = await apiClient.put(`/users/${userId}`, updates);
    return data;
  },
};

export async function fetchDashboardSummary() {
  const { data } = await apiClient.get("/dashboard/summary");
  return data;
}
