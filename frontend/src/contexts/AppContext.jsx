import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  customerApi,
  getAccessToken,
  loadAppData,
  loginRequest,
  logoutRequest,
  meRequest,
  orderApi,
  productApi,
  supplierApi,
} from "../services/api";
import { parseAmount } from "../utils/orderHelpers";

const AppContext = createContext(null);

const rolePermissions = {
  admin: {
    canManageProducts: true,
    canManageSuppliers: true,
    canManageOrders: true,
    canViewProfit: true,
    canAddCustomer: true,
  },
  staff: {
    canManageProducts: false,
    canManageSuppliers: false,
    canManageOrders: true,
    canViewProfit: false,
    canAddCustomer: true,
  },
  viewer: {
    canManageProducts: false,
    canManageSuppliers: false,
    canManageOrders: false,
    canViewProfit: false,
    canAddCustomer: false,
  },
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(getAccessToken()));
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiError, setApiError] = useState("");

  const refreshData = useCallback(async () => {
    if (!getAccessToken()) return;
    setIsLoadingData(true);
    setApiError("");
    try {
      const data = await loadAppData();
      setProducts(data.products);
      setSuppliers(data.suppliers);
      setCustomers(data.customers);
      setOrders(data.orders);
      setSupplierTransactions(data.supplierTransactions);
    } catch (error) {
      setApiError(error.response?.data?.message || "Unable to load inventory data.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrapUser() {
      if (!getAccessToken()) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const currentUser = await meRequest();
        setUser(currentUser);
        await refreshData();
      } catch (error) {
        await logoutRequest();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrapUser();
  }, [refreshData]);

  const login = async ({ email, password }) => {
    const signedInUser = await loginRequest({ email, password });
    setUser(signedInUser);
    await refreshData();
    return signedInUser;
  };

  const logout = async () => {
    await logoutRequest();
    setUser(null);
    setProducts([]);
    setSuppliers([]);
    setCustomers([]);
    setOrders([]);
    setSupplierTransactions([]);
  };

  const currentPermissions = rolePermissions[user?.role ?? "viewer"];

  const addProduct = async (product) => {
    const createdProduct = await productApi.create(product);
    setProducts((prev) => [...prev, createdProduct]);
    return createdProduct;
  };

  const updateProduct = async (productId, updates) => {
    const updatedProduct = await productApi.update(productId, updates);
    setProducts((prev) =>
      prev.map((product) => (product.id === productId ? updatedProduct : product))
    );
    return updatedProduct;
  };

  const deleteProduct = async (productId) => {
    await productApi.delete(productId);
    setProducts((prev) => prev.filter((product) => product.id !== productId));
  };

  const addSupplier = async (supplier) => {
    const createdSupplier = await supplierApi.create(supplier);
    setSuppliers((prev) => [...prev, createdSupplier]);
    return createdSupplier;
  };

  const addCustomer = async (customer) => {
    const createdCustomer = await customerApi.create(customer);
    setCustomers((prev) => [...prev, createdCustomer]);
    return createdCustomer;
  };

  const addSupplierTransaction = async (transaction) => {
    const createdTransaction = await supplierApi.createTransaction(transaction);
    setSupplierTransactions((prev) => [createdTransaction, ...prev]);
    await refreshData();
    return createdTransaction;
  };

  const addOrder = async (order) => {
    const createdOrder = await orderApi.create(order);
    setOrders((prev) => [createdOrder, ...prev]);
    await refreshData();
    return createdOrder;
  };

  const updateOrder = async (orderId, updates) => {
    const updatedOrder = await orderApi.update(orderId, updates);
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? updatedOrder : order))
    );
    await refreshData();
    return updatedOrder;
  };

  const computedStats = useMemo(
    () => ({
      totalProducts: products.length,
      lowStockCount: products.filter((product) => product.quantity <= product.reorderLevel).length,
      totalSuppliers: suppliers.length,
      totalCustomers: customers.length,
      totalOrders: orders.length,
      inventoryValue: products.reduce(
        (sum, product) => sum + parseAmount(product.price) * product.quantity,
        0
      ),
    }),
    [products, suppliers, customers, orders]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isBootstrapping,
        isLoadingData,
        apiError,
        permissions: currentPermissions,
        login,
        logout,
        refreshData,
        products,
        suppliers,
        customers,
        orders,
        supplierTransactions,
        legacyOrderMigrationRun: false,
        addProduct,
        updateProduct,
        deleteProduct,
        addSupplier,
        addSupplierTransaction,
        addCustomer,
        addOrder,
        updateOrder,
        ...currentPermissions,
        ...computedStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }

  return context;
}
