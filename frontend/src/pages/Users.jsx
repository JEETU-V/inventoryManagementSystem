import { useEffect, useState } from "react";
import { Pencil, Plus, UserRoundCog } from "lucide-react";
import { useAppData } from "../contexts/useAppData";
import { userApi } from "../services/api";

const EMPTY_FORM = { name: "", email: "", role: "staff", password: "" };

function Users() {
  const { user: currentUser } = useAppData();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    userApi.list()
      .then((accounts) => {
        if (active) setUsers(accounts);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load user accounts.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function openCreateForm() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  function openEditForm(account) {
    setEditingUser(account);
    setForm({ name: account.name, email: account.email, role: account.role, password: "" });
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const updates = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      if (form.password) updates.password = form.password;
      if (editingUser) {
        const updated = await userApi.update(editingUser.id, updates);
        setUsers((previous) => previous.map((account) => account.id === updated.id ? updated : account));
        setNotice("Account updated.");
      } else {
        const created = await userApi.create({ ...updates, password: form.password });
        setUsers((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
        setNotice("Account created.");
      }
      setIsFormOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save this account.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(account) {
    const action = account.isActive ? "deactivate" : "reactivate";
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${account.name}'s account?`)) return;
    setError("");
    setNotice("");
    try {
      const updated = await userApi.update(account.id, { isActive: !account.isActive });
      setUsers((previous) => previous.map((entry) => entry.id === updated.id ? updated : entry));
      setNotice(`Account ${updated.isActive ? "reactivated" : "deactivated"}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to change account status.");
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Team access</h1>
          <p className="mt-1 text-slate-500">Manage accounts and the work each role can perform.</p>
        </div>
        <button type="button" onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700">
          <Plus size={17} /> Add account
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold text-slate-900">{editingUser ? "Edit account" : "Create account"}</h2>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Name</span>
            <input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Email</span>
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Role</span>
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} disabled={editingUser?.id === currentUser.id} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 disabled:bg-slate-100">
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          {editingUser?.id === currentUser.id && <p className="md:col-span-2 text-xs text-slate-500">Ask another administrator to change your role.</p>}
          <label className="space-y-1 text-sm text-slate-700">
            <span>{editingUser ? "New password (optional)" : "Password"}</span>
            <input required={!editingUser} minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5" />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Close</button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save account"}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading team accounts…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No accounts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((account) => (
                  <tr key={account.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{account.name}{account.id === currentUser.id && <span className="ml-2 text-xs text-slate-400">You</span>}</div>
                      <div className="text-slate-500">{account.email}</div>
                    </td>
                    <td className="px-5 py-4 capitalize text-slate-700">{account.role}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${account.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {account.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEditForm(account)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"><Pencil size={14} /> Edit</button>
                        {account.id !== currentUser.id && (
                          <button type="button" onClick={() => toggleActive(account)} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                            {account.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <UserRoundCog size={18} className="mt-0.5 shrink-0" />
        <p>Admins manage all records and team access. Staff can create orders and maintain customer records. Viewers have read-only access. Account role changes take effect immediately.</p>
      </div>
    </section>
  );
}

export default Users;
