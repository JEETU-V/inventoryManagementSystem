import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AppProvider } from "./contexts/AppContext";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import Profit from "./pages/Profit";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import MainLayout from "./components/layout/MainLayout";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />

        {/* Inventory */}
        <Route
          path="/inventory"
          element={
            <MainLayout>
              <Inventory />
            </MainLayout>
          }
        />

        {/* Products */}
        <Route
          path="/products"
          element={
            <MainLayout>
              <Products />
            </MainLayout>
          }
        />

        {/* Suppliers */}
        <Route
          path="/suppliers"
          element={
            <MainLayout>
              <Suppliers />
            </MainLayout>
          }
        />

        {/* Customers */}
        <Route
          path="/customers"
          element={
            <MainLayout>
              <Customers />
            </MainLayout>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <MainLayout>
              <Orders />
            </MainLayout>
          }
        />

        {/* Profit */}
        <Route
          path="/profit"
          element={
            <MainLayout>
              <Profit />
            </MainLayout>
          }
        />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AppProvider>
  );
}

export default App;