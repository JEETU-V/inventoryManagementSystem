import axios from "axios";
import { attachApiErrorHandling } from "./apiErrors";

const TOKEN_KEY = "ims-customer-portal-token";

const customerPortalClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

attachApiErrorHandling(customerPortalClient);

customerPortalClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getCustomerPortalToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearCustomerPortalToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function saveCustomerPortalToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export async function registerCustomerPortal(details) {
  const { data } = await customerPortalClient.post("/customers/portal/register", details);
  saveCustomerPortalToken(data.accessToken);
  return data;
}

export async function loginCustomerPortal(credentials) {
  const { data } = await customerPortalClient.post("/customers/portal/login", credentials);
  saveCustomerPortalToken(data.accessToken);
  return data;
}

export async function loadCustomerPortalDashboard() {
  const { data } = await customerPortalClient.get("/customers/portal/dashboard");
  return data;
}

export async function changeCustomerPortalPassword(passwords) {
  const { data } = await customerPortalClient.post("/customers/portal/password", passwords);
  return data;
}

export async function logoutCustomerPortal() {
  try {
    await customerPortalClient.post("/auth/logout");
  } finally {
    clearCustomerPortalToken();
  }
}
