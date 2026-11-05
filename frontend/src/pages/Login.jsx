import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Boxes, CircleCheck, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAppData } from "../contexts/useAppData";
import { apiErrorMessage } from "../services/apiErrors";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Stockroom";

function Login({ platformAdminMode = false, businessSlug = "", registrationMode = false }) {
  const [mode, setMode] = useState(registrationMode ? "register" : "login");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login, loginPlatformAdmin, register, selectBusiness, logout } = useAppData();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.isPlatformAdmin) {
        navigate("/platform-admin", { replace: true });
      } else if (!businessSlug) {
        const business = user.businesses?.[0];
        navigate(business ? `/shop/${business.slug}/dashboard` : "/dashboard", { replace: true });
      }
    }
  }, [user, navigate, businessSlug]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !email.trim()
      || !password.trim()
      || (!platformAdminMode && mode === "register" && (!name.trim() || !businessName.trim()))
    ) {
      setError(mode === "register"
        ? "Enter your name, business name, email, and password."
        : "Please enter both email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      let signedInUser;
      if (mode === "register" && businessSlug) {
        setError("Create a new business workspace from the main business sign-in page.");
        return;
      } else if (mode === "register") {
        signedInUser = await register({ name, businessName, businessType, email, password });
      } else {
        if (platformAdminMode) {
          signedInUser = await loginPlatformAdmin({ email, password });
        } else {
          signedInUser = await login({ email, password });
          if (businessSlug) {
            const business = signedInUser.businesses?.find((item) => item.slug === businessSlug);
            if (!business) {
              await logout();
              throw new Error("This account does not have access to that shop workspace.");
            }
            await selectBusiness(business.id);
          }
        }
      }
      const targetBusiness = businessSlug
        ? businessSlug
        : signedInUser?.businesses?.[0]?.slug;
      navigate(
        platformAdminMode
          ? "/platform-admin"
          : signedInUser?.isPlatformAdmin
            ? "/platform-admin"
            : targetBusiness ? `/shop/${targetBusiness}/dashboard` : "/dashboard",
        { replace: true }
      );
    } catch (error) {
      const fallback = mode === "register"
        ? "Unable to create your workspace."
        : "Unable to sign in.";
      setError(error.response?.status >= 500
        ? error.userMessage || apiErrorMessage(error, fallback)
        : error.response?.data?.message || error.message || fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-showcase-inner">
          <div className="login-brand">
            <span className="brand-mark"><Boxes size={19} strokeWidth={2.2} /></span>
            <span className="brand-copy"><strong>{APP_NAME}</strong><small>INVENTORY STUDIO</small></span>
          </div>
          <div className="showcase-copy">
            <span className="showcase-eyebrow"><span /> YOUR SHOP, IN GOOD HANDS</span>
            <h1>Make room<br />for what’s next.</h1>
            <p>A thoughtful space for your products, people, and the work that brings them together.</p>
          </div>
          <div className="showcase-illustration" aria-hidden="true">
            <div className="illustration-glow" />
            <div className="illustration-card illustration-card-back"><span /><span /><span /></div>
            <div className="illustration-card illustration-card-front">
              <div className="illustration-card-top"><span className="illustration-mark"><Boxes size={17} /></span><span className="illustration-dots">•••</span></div>
              <div className="illustration-label">INVENTORY OVERVIEW</div>
              <div className="illustration-number">1,284 <small>units</small></div>
              <div className="illustration-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="illustration-card-bottom"><span>Stock on hand</span><strong><CircleCheck size={13} /> Looking good</strong></div>
            </div>
            <span className="float-dot float-dot-one" />
            <span className="float-dot float-dot-two" />
          </div>
          <div className="showcase-footnote"><span><CircleCheck size={14} /> Everything in its place</span><span>01 — 03</span></div>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <span className="brand-mark"><Boxes size={19} strokeWidth={2.2} /></span>
            <span className="brand-copy"><strong>{APP_NAME}</strong><small>INVENTORY STUDIO</small></span>
          </div>
          <span className="login-step">
            {platformAdminMode ? <ShieldCheck size={14} /> : <LockKeyhole size={14} />}
            {platformAdminMode ? "PLATFORM ADMINISTRATOR" : mode === "register" ? "CREATE A WORKSPACE" : "SECURE SIGN IN"}
          </span>
          <h2>
            {platformAdminMode
              ? "Platform administrator sign in."
              : mode === "register" ? "Start your workspace." : "Welcome back."}
          </h2>
          <p className="login-subtitle">
            {platformAdminMode
              ? "Sign in with an account authorized for platform administration."
              : mode === "register"
              ? "Set up your business workspace to get started."
              : "Sign in to continue to your workspace."}
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            {!platformAdminMode && mode === "register" && (
              <>
                <label className="login-field">
                  <span>Your name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="login-field">
                  <span>Business name</span>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    required
                    autoComplete="organization"
                  />
                </label>
                <label className="login-field">
                  <span>Business type</span>
                  <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="both">Retail and wholesale</option>
                  </select>
                </label>
              </>
            )}
            <label className="login-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@yourbusiness.com"
                aria-invalid={Boolean(error)}
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder="Enter your password"
                aria-invalid={Boolean(error)}
              />
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><LoaderCircle size={17} className="loading-icon" /> {mode === "register" ? "Creating workspace…" : "Signing in…"}</>
                : <>{mode === "register" ? "Create workspace" : platformAdminMode ? "Sign in as admin" : "Sign in"} <ArrowRight size={17} /></>}
            </button>
          </form>

          {!platformAdminMode && (
            <>
              {!businessSlug && <button
                  type="button"
                  className="login-mode-toggle"
                  onClick={() => {
                    setMode((current) => current === "login" ? "register" : "login");
                    setError("");
                  }}
                >
                  {mode === "register" ? "Already have an account? Sign in" : `New to ${APP_NAME}? Create a workspace`}
                </button>}
              <Link className="login-mode-toggle block" to="/platform-admin/login">
                Login as an admin
              </Link>
            </>
          )}
          {platformAdminMode && (
            <Link className="login-mode-toggle block" to="/login">
              Business owner or staff? Sign in here
            </Link>
          )}
          <p className="login-security"><LockKeyhole size={13} /> Your business data stays private and secure.</p>
        </div>
        <footer className="login-footer"><span>{APP_NAME} Inventory Studio</span><span>Made for the details that matter.</span></footer>
      </section>
    </main>
  );
}

export default Login;
