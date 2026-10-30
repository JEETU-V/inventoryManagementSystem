import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Boxes, CircleCheck, LoaderCircle, LockKeyhole } from "lucide-react";
import { useAppData } from "../contexts/useAppData";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login } = useAppData();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || "Unable to sign in.");
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
            <span className="brand-copy"><strong>Stockroom</strong><small>INVENTORY STUDIO</small></span>
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
            <span className="brand-copy"><strong>Stockroom</strong><small>INVENTORY STUDIO</small></span>
          </div>
          <span className="login-step"><LockKeyhole size={14} /> SECURE SIGN IN</span>
          <h2>Welcome back.</h2>
          <p className="login-subtitle">Sign in to continue to your workspace.</p>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
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
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(error)}
              />
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? <><LoaderCircle size={17} className="loading-icon" /> Signing in…</> : <>Sign in <ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="login-security"><LockKeyhole size={13} /> Your business data stays private and secure.</p>
        </div>
        <footer className="login-footer"><span>Stockroom Inventory Studio</span><span>Made for the details that matter.</span></footer>
      </section>
    </main>
  );
}

export default Login;
