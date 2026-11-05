import { useCallback, useEffect, useMemo, useState } from "react";
import AppContext from "./AppContextDefinition";
import {
  businessApi,
  customerApi,
  getActiveBusinessId,
  getAccessToken,
  inventoryApi,
  loadAppData,
  loginRequest,
  logoutRequest,
  meRequest,
  orderApi,
  platformAdminLoginRequest,
  productApi,
  registerRequest,
  setActiveBusinessId as saveActiveBusinessId,
  supplierApi,
} from "../services/api";
import { parseAmount } from "../utils/orderHelpers";
import { apiErrorMessage } from "../services/apiErrors";

const rolePermissions = {
  admin: {
    canManageProducts: true,
    canManageSuppliers: true,
    canManageOrders: true,
    canViewProfit: true,
    canAddCustomer: true,
    canAdjustInventory: true,
    canManageUsers: true,
    canDeleteCustomers: true,
  },
  staff: {
    canManageProducts: false,
    canManageSuppliers: false,
    canManageOrders: true,
    canViewProfit: false,
    canAddCustomer: true,
    canAdjustInventory: false,
    canManageUsers: false,
    canDeleteCustomers: false,
  },
  viewer: {
    canManageProducts: false,
    canManageSuppliers: false,
    canManageOrders: false,
    canViewProfit: false,
    canAddCustomer: false,
    canAdjustInventory: false,
    canManageUsers: false,
    canDeleteCustomers: false,
  },
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeBusinessId, setActiveBusinessIdState] = useState(getActiveBusinessId());
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(getAccessToken()));
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiError, setApiError] = useState("");

  const activateUserBusiness = useCallback((currentUser) => {
    const businesses = currentUser.businesses || [];
    const storedId = getActiveBusinessId();
    const selected = businesses.find((business) => String(business.id) === storedId)
      || businesses[0];
    const businessId = selected ? String(selected.id) : null;
    saveActiveBusinessId(businessId);
    setActiveBusinessIdState(businessId);
  }, []);

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
      setInventoryTransactions(data.inventoryTransactions);
      setDashboardSummary(data.dashboard);
      setSalesSummary(data.sales);
    } catch (error) {
      setApiError(apiErrorMessage(error, "Unable to load inventory data."));
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    function handleExpiredSession() {
      setUser(null);
      setActiveBusinessIdState(null);
      setApiError("Your session has expired. Sign in again to continue.");
    }
    window.addEventListener("ims:session-expired", handleExpiredSession);
    async function bootstrapUser() {
      if (!getAccessToken()) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const currentUser = await meRequest();
        activateUserBusiness(currentUser);
        setUser(currentUser);
        if (currentUser.businesses?.length) {
          await refreshData();
        }
      } catch {
        try {
          await logoutRequest();
        } catch (logoutError) {
          setApiError(apiErrorMessage(logoutError, "Unable to verify the expired session."));
        }
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrapUser();
    return () => window.removeEventListener("ims:session-expired", handleExpiredSession);
  }, [activateUserBusiness, refreshData]);

  const login = async ({ email, password }) => {
    const signedInUser = await loginRequest({ email, password });
    activateUserBusiness(signedInUser);
    setUser(signedInUser);
    if (signedInUser.businesses?.length) {
      await refreshData();
    }
    return signedInUser;
  };

  const loginPlatformAdmin = async ({ email, password }) => {
    const signedInUser = await platformAdminLoginRequest({ email, password });
    activateUserBusiness(signedInUser);
    setUser(signedInUser);
    setProducts([]);
    setSuppliers([]);
    setCustomers([]);
    setOrders([]);
    setSupplierTransactions([]);
    setInventoryTransactions([]);
    setDashboardSummary(null);
    setSalesSummary(null);
    setApiError("");
    return signedInUser;
  };

  const register = async (details) => {
    const newUser = await registerRequest(details);
    activateUserBusiness(newUser);
    setUser(newUser);
    await refreshData();
    return newUser;
  };

  const selectBusiness = useCallback(async (businessId) => {
    if (!user?.businesses?.some((business) => String(business.id) === String(businessId))) {
      throw new Error("You do not have access to that business.");
    }
    const selectedId = String(businessId);
    saveActiveBusinessId(selectedId);
    setActiveBusinessIdState(selectedId);
    await refreshData();
  }, [user, refreshData]);

  const createBusiness = async (details) => {
    const business = await businessApi.create(details);
    const updatedUser = {
      ...user,
      businesses: [...(user?.businesses || []), business],
    };
    setUser(updatedUser);
    saveActiveBusinessId(String(business.id));
    setActiveBusinessIdState(String(business.id));
    await refreshData();
    return business;
  };

  const logout = async () => {
    let logoutError;
    try {
      await logoutRequest();
    } catch (error) {
      logoutError = error;
    } finally {
      setUser(null);
      setActiveBusinessIdState(null);
      setProducts([]);
      setSuppliers([]);
      setCustomers([]);
      setOrders([]);
      setSupplierTransactions([]);
      setInventoryTransactions([]);
      setDashboardSummary(null);
      setSalesSummary(null);
    }
    setApiError(logoutError
      ? "You were signed out on this device, but server revocation could not be confirmed."
      : "");
  };

  const activeBusiness = user?.businesses?.find(
    (business) => String(business.id) === activeBusinessId
  );
  const permissionRole = ["owner", "manager"].includes(activeBusiness?.role)
    ? "admin"
    : activeBusiness?.role || user?.role || "viewer";
  const currentPermissions = rolePermissions[permissionRole] || rolePermissions.viewer;

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

  const updateSupplier = async (supplierId, updates) => {
    const updatedSupplier = await supplierApi.update(supplierId, updates);
    setSuppliers((previous) =>
      previous.map((supplier) => supplier.id === supplierId ? updatedSupplier : supplier)
    );
    return updatedSupplier;
  };

  const deleteSupplier = async (supplierId) => {
    await supplierApi.delete(supplierId);
    setSuppliers((previous) => previous.filter((supplier) => supplier.id !== supplierId));
  };

  const addCustomer = async (customer) => {
    const createdCustomer = await customerApi.create(customer);
    setCustomers((prev) => [...prev, createdCustomer]);
    return createdCustomer;
  };

  const updateCustomer = async (customerId, updates) => {
    const updatedCustomer = await customerApi.update(customerId, updates);
    setCustomers((previous) =>
      previous.map((customer) => customer.id === customerId ? updatedCustomer : customer)
    );
    return updatedCustomer;
  };

  const deleteCustomer = async (customerId) => {
    await customerApi.delete(customerId);
    setCustomers((previous) => previous.filter((customer) => customer.id !== customerId));
  };

  const activateCustomerPortal = async (customerId) => {
    const result = await customerApi.activatePortal(customerId);
    setCustomers((previous) =>
      previous.map((customer) => customer.id === customerId ? result.customer : customer)
    );
    return result;
  };

  const createInventoryTransaction = async (transaction) => {
    const updatedProduct = await inventoryApi.createTransaction(transaction);
    setProducts((previous) =>
      previous.map((product) => product.id === updatedProduct.id ? updatedProduct : product)
    );
    setInventoryTransactions(await inventoryApi.listTransactions());
    return updatedProduct;
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

  const cancelOrder = async (orderId) => {
    const cancelledOrder = await orderApi.cancel(orderId);
    setOrders((previous) =>
      previous.map((order) => order.id === orderId ? cancelledOrder : order)
    );
    await refreshData();
    return cancelledOrder;
  };

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.quantity <= product.reorderLevel),
    [products]
  );
  const recentOrders = useMemo(() => [...orders].slice(0, 5), [orders]);

  const computedStats = useMemo(
    () => ({
      totalProducts: products.length,
      lowStockCount: products.filter((product) => product.quantity <= product.reorderLevel).length,
      totalSuppliers: suppliers.length,
      totalCustomers: customers.length,
      totalOrders: orders.length,
      inventoryValue: products.reduce(
        (sum, product) => sum + parseAmount(product.purchasePrice) * product.quantity,
        0
      ),
    }),
    [products, suppliers, customers, orders]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        isPlatformAdmin: Boolean(user?.isPlatformAdmin),
        businesses: user?.businesses || [],
        activeBusiness,
        activeBusinessId,
        isAuthenticated: Boolean(user),
        isBootstrapping,
        isLoadingData,
        apiError,
        permissions: currentPermissions,
        login,
        loginPlatformAdmin,
        register,
        selectBusiness,
        createBusiness,
        logout,
        refreshData,
        products,
        suppliers,
        customers,
        orders,
        supplierTransactions,
        inventoryTransactions,
        dashboardSummary,
        salesSummary,
        lowStockProducts,
        recentOrders,
        legacyOrderMigrationRun: false,
        addProduct,
        updateProduct,
        deleteProduct,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierTransaction,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        activateCustomerPortal,
        createInventoryTransaction,
        addOrder,
        updateOrder,
        cancelOrder,
        ...currentPermissions,
        ...computedStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
