import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AppProvider, useAppData } from "./contexts/AppContext";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import Profit from "./pages/Profit";
import Sales from "./pages/Sales";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import BillGenerator from "./features/orders/BillGenerator";
import LoadingSpinner from "./components/ui/LoadingSpinner";

import MainLayout from "./components/layout/MainLayout";

function RequireAuth({ children }) {
  const { isAuthenticated, isBootstrapping } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading your workspace..." />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading..." />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isBootstrapping, canViewProfit } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading your workspace..." />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return canViewProfit ? children : <Navigate to="/dashboard" replace />;
}

function RootRedirect() {
  const { isAuthenticated, isBootstrapping } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading..." />;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </RequireAuth>
          }
        />

        {/* Inventory */}
        <Route
          path="/inventory"
          element={
            <RequireAuth>
              <MainLayout>
                <Inventory />
              </MainLayout>
            </RequireAuth>
          }
        />

        {/* Products */}
        <Route
          path="/products"
          element={
            <RequireAuth>
              <MainLayout>
                <Products />
              </MainLayout>
            </RequireAuth>
          }
        />

        {/* Suppliers */}
        <Route
          path="/suppliers"
          element={
            <RequireAuth>
              <MainLayout>
                <Suppliers />
              </MainLayout>
            </RequireAuth>
          }
        />

        {/* Customers */}
        <Route
          path="/customers"
          element={
            <RequireAuth>
              <MainLayout>
                <Customers />
              </MainLayout>
            </RequireAuth>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <MainLayout>
                <Orders />
              </MainLayout>
            </RequireAuth>
          }
        />

        {/* Profit */}
        <Route
          path="/profit"
          element={
            <AdminRoute>
              <MainLayout>
                <Profit />
              </MainLayout>
            </AdminRoute>
          }
        />

        {/* Sales */}
        <Route
          path="/sales"
          element={
            <RequireAuth>
              <MainLayout>
                <Sales />
              </MainLayout>
            </RequireAuth>
          }
        />

        {/* Bill */}
        <Route
          path="/bill/:orderId"
          element={
            <RequireAuth>
              <BillGenerator />
            </RequireAuth>
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppProvider>
  );
}

export default App;
