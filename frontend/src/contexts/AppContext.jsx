import { createContext, useContext } from "react";
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
  const [products, setProducts] = useLocalStorageState("ims-products", initialProducts);
  const [suppliers, setSuppliers] = useLocalStorageState("ims-suppliers", initialSuppliers);
  const [customers, setCustomers] = useLocalStorageState("ims-customers", initialCustomers);
  const [orders, setOrders] = useLocalStorageState("ims-orders", initialOrders);
  const [supplierTransactions, setSupplierTransactions] = useLocalStorageState(
    "ims-supplier-transactions",
    initialSupplierTransactions
  );

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

  const totalProducts = products.length;
  const lowStockCount = products.filter((product) => product.quantity <= product.reorderLevel).length;
  const totalSuppliers = suppliers.length;
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const inventoryValue = products.reduce(
    (sum, product) => sum + parseAmount(product.price) * product.quantity,
    0
  );

  return (
    <AppContext.Provider
      value={{
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
        totalProducts,
        lowStockCount,
        totalSuppliers,
        totalCustomers,
        totalOrders,
        inventoryValue,
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
