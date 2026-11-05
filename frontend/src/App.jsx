import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { AppProvider } from "./contexts/AppContext";
import { useAppData } from "./contexts/useAppData";
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
import Users from "./pages/Users";
import BillGenerator from "./features/orders/BillGenerator";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import CustomerPortalLogin from "./pages/CustomerPortalLogin";
import CustomerPortalDashboard from "./pages/CustomerPortalDashboard";
import PlatformAdmin from "./pages/PlatformAdmin";
import ShopCustomerExperience from "./pages/ShopCustomerExperience";
import ShopSettings from "./pages/ShopSettings";
import { getCustomerPortalToken } from "./services/customerPortalApi";

import MainLayout from "./components/layout/MainLayout";

const workspacePages = {
  dashboard: Dashboard,
  inventory: Inventory,
  products: Products,
  suppliers: Suppliers,
  purchases: Suppliers,
  customers: Customers,
  orders: Orders,
  sales: Sales,
  reports: Sales,
  profit: Profit,
  users: Users,
  settings: ShopSettings,
  billing: Sales,
};

function workspacePath(user, fallback = "/dashboard") {
  const slug = user?.businesses?.[0]?.slug;
  return slug ? `/shop/${slug}/dashboard` : fallback;
}

function redirectLegacyWorkspace(pathname, activeBusiness) {
  if (!activeBusiness?.slug || pathname.startsWith("/shop/")) return null;
  const match = pathname.match(/^\/(dashboard|inventory|products|suppliers|purchases|customers|orders|sales|reports|profit|users|settings|billing|bill\/\d+)$/);
  return match ? `/shop/${activeBusiness.slug}/${match[1]}` : null;
}

function RequireAuth({ children }) {
  const { isAuthenticated, isBootstrapping, isPlatformAdmin, activeBusiness } = useAppData();
  const location = useLocation();
  if (isBootstrapping) return <LoadingSpinner message="Loading your workspace..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isPlatformAdmin) return <Navigate to="/platform-admin" replace />;
  const target = redirectLegacyWorkspace(location.pathname, activeBusiness);
  return target ? <Navigate to={`${target}${location.search}`} replace /> : children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isBootstrapping, isPlatformAdmin, user } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading..." />;
  return isAuthenticated
    ? <Navigate to={isPlatformAdmin ? "/platform-admin" : workspacePath(user)} replace />
    : children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isBootstrapping, isPlatformAdmin, canViewProfit, activeBusiness } = useAppData();
  const location = useLocation();
  if (isBootstrapping) return <LoadingSpinner message="Loading your workspace..." />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (isPlatformAdmin) return <Navigate to="/platform-admin" replace />;
  const target = redirectLegacyWorkspace(location.pathname, activeBusiness);
  if (target) return <Navigate to={`${target}${location.search}`} replace />;
  return canViewProfit ? children : <Navigate to="/dashboard" replace />;
}

function PlatformAdminRoute({ children }) {
  const { isAuthenticated, isBootstrapping, isPlatformAdmin } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading platform tools..." />;
  if (!isAuthenticated) return <Navigate to="/platform-admin/login" replace />;
  return isPlatformAdmin ? children : <Navigate to="/dashboard" replace />;
}

function PlatformAdminLoginRoute() {
  const { isAuthenticated, isBootstrapping, isPlatformAdmin } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading sign in..." />;
  if (isAuthenticated) {
    return <Navigate to={isPlatformAdmin ? "/platform-admin" : "/dashboard"} replace />;
  }
  return <Login platformAdminMode />;
}

function CustomerPortalRoute({ children }) {
  const { isBootstrapping } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading..." />;
  return getCustomerPortalToken() ? children : <Navigate to="/portal/login" replace />;
}

function RootRedirect() {
  const { isAuthenticated, isBootstrapping, isPlatformAdmin, user } = useAppData();
  if (isBootstrapping) return <LoadingSpinner message="Loading..." />;
  return <Navigate to={isAuthenticated ? (isPlatformAdmin ? "/platform-admin" : workspacePath(user)) : "/login"} replace />;
}

function ShopOwnerAccess() {
  const { slug = "", page = "dashboard", orderId } = useParams();
  const { user, isAuthenticated, isBootstrapping, isPlatformAdmin, activeBusinessId, selectBusiness, canViewProfit, logout } = useAppData();
  const [selectionError, setSelectionError] = useState(null);
  const business = user?.businesses?.find((item) => item.slug === slug);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !business || String(business.id) === String(activeBusinessId)) return;
    let active = true;
    selectBusiness(business.id)
      .catch((error) => {
        if (active) setSelectionError({ slug, message: error.message || "Unable to open this shop workspace." });
      });
    return () => { active = false; };
  }, [isAuthenticated, business, activeBusinessId, selectBusiness, slug]);

  if (isBootstrapping) return <LoadingSpinner message="Loading shop workspace..." />;
  if (!isAuthenticated) return <Login businessSlug={slug} />;
  if (isPlatformAdmin) return <Navigate to="/platform-admin" replace />;
  if (selectionError?.slug === slug) return <p className="p-6 text-red-700" role="alert">{selectionError.message}</p>;
  if (!business) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Shop workspace unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">This account is not an active member of “{slug}”. Sign in with an authorized shop account.</p>
          <button type="button" className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white" onClick={async () => { await logout(); navigate("/login"); }}>
            Sign in as another account
          </button>
        </section>
      </main>
    );
  }
  if (String(business.id) !== String(activeBusinessId)) {
    return <LoadingSpinner message="Switching to this shop workspace..." />;
  }
  if (["profit", "users", "settings"].includes(page) && !canViewProfit) {
    return <Navigate to={`/shop/${slug}/dashboard`} replace />;
  }
  const Page = page === "settings" ? ShopSettings : workspacePages[page];
  if (!Page) return <Navigate to={`/shop/${slug}/dashboard`} replace />;
  if (page === "bill") {
    return <MainLayout><BillGenerator key={`${slug}-${orderId}`} /></MainLayout>;
  }
  return <MainLayout><Page /></MainLayout>;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/register" element={<PublicRoute><Login registrationMode /></PublicRoute>} />
          <Route path="/platform-admin/login" element={<PlatformAdminLoginRoute />} />
          <Route path="/shop/:slug/customer/orders/:orderId" element={<ShopCustomerExperience />} />
          <Route path="/shop/:slug/customer/*" element={<ShopCustomerExperience />} />
          <Route path="/shop/:slug" element={<ShopOwnerAccess />} />
          <Route path="/shop/:slug/:page" element={<ShopOwnerAccess />} />
          <Route path="/shop/:slug/:page/:orderId" element={<ShopOwnerAccess />} />
          <Route path="/portal/login" element={<CustomerPortalLogin />} />
          <Route
            path="/portal/dashboard"
            element={
              <CustomerPortalRoute>
                <CustomerPortalDashboard />
              </CustomerPortalRoute>
            }
          />
          <Route
            path="/platform-admin"
            element={
              <PlatformAdminRoute>
                <MainLayout>
                  <PlatformAdmin />
                </MainLayout>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/platform-admin/:section"
            element={
              <PlatformAdminRoute>
                <MainLayout>
                  <PlatformAdmin />
                </MainLayout>
              </PlatformAdminRoute>
            }
          />

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

        {/* Team access */}
        <Route
          path="/users"
          element={
            <AdminRoute>
              <MainLayout>
                <Users />
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
