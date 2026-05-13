import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const oauthError = new URLSearchParams(location.search).get("error");
  const oauthErrorMsg: Record<string, string> = {
    google_denied: "Google sign-in was cancelled.",
    google_token: "Google sign-in failed. Please try again.",
    google_email: "Could not retrieve your Google email.",
    google_failed: "Google sign-in failed. Please try again.",
    github_denied: "GitHub sign-in was cancelled.",
    github_token: "GitHub sign-in failed. Please try again.",
    github_email: "Could not retrieve your GitHub email.",
    github_failed: "GitHub sign-in failed. Please try again.",
  };
  const [error, setError] = useState(oauthError ? (oauthErrorMsg[oauthError] ?? "OAuth sign-in failed.") : "");
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

        {/* OAuth */}
        <div className="space-y-2 mb-5">
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium rounded-lg border border-line bg-paper text-ink hover:bg-surface hover:border-ink/30 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>
          <a
            href="/api/auth/github-oauth"
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium rounded-lg border border-line bg-paper text-ink hover:bg-surface hover:border-ink/30 transition-colors"
          >
            <Icon name="github" size={16} />
            Continue with GitHub
          </a>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-line" />
          <span className="text-[11px] text-ink-faint uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-line" />
        </div>

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
