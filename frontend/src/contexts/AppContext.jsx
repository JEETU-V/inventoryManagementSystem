import { createContext, useContext, useMemo } from "react";
import useLocalStorageState from "../hooks/useLocalStorageState";

const AppContext = createContext(null);

const initialProducts = [
  {
    id: 1,
    name: "Ballpoint Pens",
    sku: "ST-1001",
    category: "Stationery",
    supplierId: 1,
    purchasePrice: "₹25",
    quantity: 42,
    price: "₹45",
    reorderLevel: 15,
  },
  {
    id: 2,
    name: "A4 Notebooks",
    sku: "ST-1002",
    category: "Paper",
    supplierId: 1,
    purchasePrice: "₹65",
    quantity: 18,
    price: "₹120",
    reorderLevel: 10,
  },
  {
    id: 3,
    name: "Glue Stick",
    sku: "ST-1003",
    category: "Adhesives",
    supplierId: 2,
    purchasePrice: "₹30",
    quantity: 7,
    price: "₹55",
    reorderLevel: 12,
  },
];

const initialSuppliers = [
  {
    id: 1,
    name: "Rapid Stationery Co.",
    contact: "+91 98765 43210",
    email: "contact@rapidstationery.com",
    productsSupplied: "Pens, Notebooks, Paper",
  },
  {
    id: 2,
    name: "General Store Supplies",
    contact: "+91 91234 56789",
    email: "sales@generalsupplies.in",
    productsSupplied: "Glue, Tape, Clips",
  },
];

const initialCustomers = [
  {
    id: 1,
    name: "Ravi Sharma",
    phone: "+91 91234 56780",
    email: "ravi@example.com",
    address: "Shop No. 12, Market Road, Mumbai",
  },
  {
    id: 2,
    name: "Priya Singh",
    phone: "+91 99876 54321",
    email: "priya@example.com",
    address: "12B, Stationery Lane, Delhi",
  },
];

const initialOrders = [
  {
    id: 1,
    orderNumber: "ORD-1001",
    customerId: 1,
    customerName: "Ravi Sharma",
    productId: 2,
    productName: "A4 Notebooks",
    supplierId: 1,
    quantity: 5,
    totalPrice: "₹600",
    status: "Completed",
    date: "2026-05-10",
  },
  {
    id: 2,
    orderNumber: "ORD-1002",
    customerId: 2,
    customerName: "Priya Singh",
    productId: 1,
    productName: "Ballpoint Pens",
    supplierId: 1,
    quantity: 12,
    totalPrice: "₹540",
    status: "Pending",
    date: "2026-05-16",
  },
];

const initialSupplierTransactions = [
  {
    id: 1,
    supplierId: 1,
    supplierName: "Rapid Stationery Co.",
    productId: 1,
    productName: "Ballpoint Pens",
    quantity: 50,
    totalCost: "₹1250",
    date: "2026-04-20",
  },
  {
    id: 2,
    supplierId: 2,
    supplierName: "General Store Supplies",
    productId: 3,
    productName: "Glue Stick",
    quantity: 30,
    totalCost: "₹900",
    date: "2026-04-18",
  },
];

function parseAmount(value) {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

export function AppProvider({ children }) {
  const [user, setUser] = useLocalStorageState("ims-user", null);
  const [products, setProducts] = useLocalStorageState("ims-products", initialProducts);
  const [suppliers, setSuppliers] = useLocalStorageState("ims-suppliers", initialSuppliers);
  const [customers, setCustomers] = useLocalStorageState("ims-customers", initialCustomers);
  const [orders, setOrders] = useLocalStorageState("ims-orders", initialOrders);
  const [supplierTransactions, setSupplierTransactions] = useLocalStorageState(
    "ims-supplier-transactions",
    initialSupplierTransactions
  );

  const login = ({ email }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const isAdmin = normalizedEmail === "admin@example.com";
    const signedInUser = {
      name: isAdmin ? "Admin" : "Inventory User",
      email: normalizedEmail,
      role: isAdmin ? "admin" : "staff",
      lastSignedIn: new Date().toISOString(),
    };
    setUser(signedInUser);
    return signedInUser;
  };

  const logout = () => setUser(null);

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

  const currentPermissions = rolePermissions[user?.role ?? "viewer"];

  const addProduct = (product) => {
    setProducts((prev) => [...prev, product]);
  };

  const updateProduct = (productId, updates) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, ...updates } : product
      )
    );
  };

  const deleteProduct = (productId) => {
    setProducts((prev) => prev.filter((product) => product.id !== productId));
  };

  const addSupplier = (supplier) => {
    setSuppliers((prev) => [...prev, supplier]);
  };

  const addCustomer = (customer) => {
    setCustomers((prev) => [...prev, customer]);
  };

  const addSupplierTransaction = (transaction) => {
    setSupplierTransactions((prev) => [...prev, transaction]);
  };

  const addOrder = (order) => {
    setOrders((prev) => [...prev, order]);
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        if (product.id === order.productId) {
          return {
            ...product,
            quantity: Math.max(0, product.quantity - order.quantity),
          };
        }
        return product;
      })
    );
  };

  const computedStats = useMemo(() => ({
    totalProducts: products.length,
    lowStockCount: products.filter((product) => product.quantity <= product.reorderLevel).length,
    totalSuppliers: suppliers.length,
    totalCustomers: customers.length,
    totalOrders: orders.length,
    inventoryValue: products.reduce(
      (sum, product) => sum + parseAmount(product.price) * product.quantity,
      0
    ),
  }), [products, suppliers, customers, orders]);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        permissions: currentPermissions,
        login,
        logout,
        products,
        suppliers,
        customers,
        orders,
        supplierTransactions,
        addProduct,
        updateProduct,
        deleteProduct,
        addSupplier,
        addSupplierTransaction,
        addCustomer,
        addOrder,
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
