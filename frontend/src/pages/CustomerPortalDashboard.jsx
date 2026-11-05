import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Boxes, LogOut, PackageCheck, ShoppingBag } from "lucide-react";
import {
  getCustomerPortalToken,
  clearCustomerPortalToken,
  changeCustomerPortalPassword,
  loadCustomerPortalDashboard,
  logoutCustomerPortal,
} from "../services/customerPortalApi";

function CustomerPortalDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    loadCustomerPortalDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.response?.status === 401 || requestError.response?.status === 404) {
          clearCustomerPortalToken();
          navigate("/portal/login", { replace: true });
          return;
        }
        setError(requestError.response?.data?.message || "Unable to load your orders.");
      });
    return () => { active = false; };
  }, [navigate]);

  if (!getCustomerPortalToken()) {
    return <Navigate to="/portal/login" replace />;
  }

  async function signOut() {
    let message = "";
    try {
      await logoutCustomerPortal();
    } catch (requestError) {
      message = requestError.userMessage || "You were signed out on this device, but server revocation could not be confirmed.";
    }
    navigate("/portal/login", { replace: true, state: { message } });
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setIsSavingPassword(true);
    try {
      await changeCustomerPortalPassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      setDashboard(await loadCustomerPortalDashboard());
    } catch (requestError) {
      setPasswordError(requestError.response?.data?.message || "Unable to update your password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-800 text-white"><Boxes size={19} /></span>
            <div>
              <p className="font-semibold text-slate-900">{dashboard?.business.name || "Customer account"}</p>
              <p className="text-xs text-slate-500">Customer portal</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" onClick={signOut} type="button">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
        <p className="text-sm font-medium text-emerald-800">Your customer account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          {dashboard ? `Hello, ${dashboard.customer.name}` : "Your orders"}
        </h1>
        <p className="mt-2 text-slate-600">View your order history and current order status.</p>

        {dashboard?.mustChangePassword ? (
          <section className="mt-7 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Set a new password</h2>
            <p className="mt-2 text-sm text-slate-600">Your business provided a temporary password. Change it before viewing your order history.</p>
            <form className="mt-5 space-y-4" onSubmit={savePassword}>
              <label className="block text-sm font-medium text-slate-700">
                Temporary password
                <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3" type="password" autoComplete="current-password" minLength={8} maxLength={128} value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                New password
                <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} required />
              </label>
              {passwordError && <p className="text-sm text-red-700" role="alert">{passwordError}</p>}
              <button className="rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 disabled:opacity-60" type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? "Saving…" : "Change password"}
              </button>
            </form>
          </section>
        ) : (
          <>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3 text-slate-500"><ShoppingBag size={18} /><span className="text-sm">All orders</span></div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{dashboard?.orderCount ?? "—"}</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3 text-slate-500"><PackageCheck size={18} /><span className="text-sm">In progress</span></div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{dashboard?.activeOrderCount ?? "—"}</p>
          </section>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Order history</h2>
          </div>
          {error && <p className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
          {!dashboard && !error && <p className="px-5 py-8 text-sm text-slate-500">Loading your order history…</p>}
          {dashboard?.orders.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">There are no orders on this account yet.</p>
          )}
          {dashboard?.orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3 font-medium">Order</th><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Items</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-4 font-medium text-slate-900">{order.orderNumber}</td>
                      <td className="px-5 py-4 text-slate-600">{order.date}</td>
                      <td className="px-5 py-4 text-slate-600">{order.totalQuantity}</td>
                      <td className="px-5 py-4 text-slate-600">{order.totalPrice}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{order.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </main>
  );
}

export default CustomerPortalDashboard;
