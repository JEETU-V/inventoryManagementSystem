import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Boxes, LoaderCircle, LockKeyhole } from "lucide-react";
import {
  getCustomerPortalToken,
  loginCustomerPortal,
  registerCustomerPortal,
} from "../services/customerPortalApi";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Stockroom";

function CustomerPortalLogin() {
  const [mode, setMode] = useState("login");
  const [businessSlug, setBusinessSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (getCustomerPortalToken()) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await registerCustomerPortal({ businessSlug, name, email, phone, address, password });
      } else {
        await loginCustomerPortal({ businessSlug, email, password });
      }
      navigate("/portal/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to access your customer account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-800 text-white">
            <Boxes size={20} />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{APP_NAME}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Customer account</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
          <LockKeyhole size={14} /> Private order access
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          {mode === "register" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in with the business workspace where you placed your orders.
        </p>
        {location.state?.message && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            {location.state.message}
          </p>
        )}

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Business workspace
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3"
              value={businessSlug}
              onChange={(event) => setBusinessSlug(event.target.value)}
              placeholder="Your business workspace slug"
              autoComplete="organization"
              required
            />
          </label>
          {mode === "register" && (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Phone
                <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Address <span className="font-normal text-slate-500">(optional)</span>
                <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3" value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" />
              </label>
            </>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3" type="password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} required />
          </label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 disabled:opacity-60" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? <><LoaderCircle size={17} className="animate-spin" /> Please wait…</>
              : <>{mode === "register" ? "Create account" : "Sign in"} <ArrowRight size={17} /></>}
          </button>
        </form>

        <button
          className="mt-6 w-full text-center text-sm font-medium text-emerald-800 hover:underline"
          type="button"
          onClick={() => {
            setMode((current) => current === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "register" ? "Already registered? Sign in" : "New customer? Create an account"}
        </button>
        <a className="mt-5 block text-center text-xs text-slate-500 hover:text-slate-800" href="/login">Business owner or staff? Go to workspace sign in</a>
      </section>
    </main>
  );
}

export default CustomerPortalLogin;
