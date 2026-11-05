import axios from "axios";
import { attachApiErrorHandling } from "./apiErrors";

const TOKEN_KEY = "ims-shop-customer-token";

const shopCustomerClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

attachApiErrorHandling(shopCustomerClient);

shopCustomerClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getShopCustomerToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearShopCustomerToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function logoutShopCustomer() {
  try {
    await shopCustomerClient.post("/auth/logout");
  } finally {
    clearShopCustomerToken();
  }
}

function saveShopCustomerToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export const shopCustomerApi = {
  async shop(slug) {
    const { data } = await shopCustomerClient.get(`/shops/${encodeURIComponent(slug)}`);
    return data;
  },
  async products(slug) {
    const { data } = await shopCustomerClient.get(`/shops/${encodeURIComponent(slug)}/products`);
    return data;
  },
  async register(slug, details) {
    const { data } = await shopCustomerClient.post(`/shops/${encodeURIComponent(slug)}/customer/register`, details);
    saveShopCustomerToken(data.accessToken);
    return data;
  },
  async login(slug, credentials) {
    const { data } = await shopCustomerClient.post(`/shops/${encodeURIComponent(slug)}/customer/login`, credentials);
    saveShopCustomerToken(data.accessToken);
    return data;
  },
  async profile(slug) {
    const { data } = await shopCustomerClient.get(`/shops/${encodeURIComponent(slug)}/customer/me`);
    return data;
  },
  async updateProfile(slug, profile) {
    const { data } = await shopCustomerClient.put(`/shops/${encodeURIComponent(slug)}/customer/me`, profile);
    return data;
  },
  async changePassword(slug, passwords) {
    const { data } = await shopCustomerClient.put(`/shops/${encodeURIComponent(slug)}/customer/password`, passwords);
    return data;
  },
  logout: logoutShopCustomer,
  async orders(slug) {
    const { data } = await shopCustomerClient.get(`/shops/${encodeURIComponent(slug)}/customer/orders`);
    return data;
  },
  async placeOrder(slug, checkout) {
    const { data } = await shopCustomerClient.post(`/shops/${encodeURIComponent(slug)}/customer/orders`, checkout);
    return data;
  },
};
