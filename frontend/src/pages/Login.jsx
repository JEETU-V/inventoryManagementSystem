import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../contexts/AppContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || "Unable to sign in.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stationery Shop Login</h1>
        <p className="text-gray-500 mb-8">Sign in to access inventory, orders, and customer management.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6">
          Use the backend admin account configured in <span className="font-semibold">.env</span>.
        </p>
      </div>
    </div>
  );
}

export default Login;
