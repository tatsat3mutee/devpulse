import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err: any) {
      const msg = err?.message?.includes("401")
        ? "Invalid email or password."
        : err?.message?.includes("429")
        ? "Too many attempts. Please wait a moment."
        : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl p-8">
        <div className="eyebrow mb-5">Account</div>
        <h1 className="display text-[26px] text-ink mb-6">Welcome back</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] text-ink-muted mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-[13.5px] rounded-lg border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[12px] text-ink-muted mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 pr-10 text-[13.5px] rounded-lg border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted hover:text-ink transition-colors"
              >
                {showPw ? "hide" : "show"}
              </button>
            </div>
          </div>

          {error && <p className="text-[12.5px] text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper rounded-lg py-2.5 text-[14px] font-medium hover:bg-ink-soft transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-[13px] text-ink-muted mt-6">
          No account?{" "}
          <Link to="/register" className="text-ink hover:text-accent transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
