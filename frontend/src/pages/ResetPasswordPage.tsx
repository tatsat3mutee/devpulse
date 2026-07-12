import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl p-8">
        <div className="eyebrow mb-5">Account</div>
        <h1 className="display text-[26px] text-ink mb-6">Choose a new password</h1>

        {done ? (
          <>
            <p className="text-[13.5px] text-ink-soft leading-relaxed">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <p className="text-center text-[13px] text-ink-muted mt-6">
              <Link to="/login" className="text-ink hover:text-accent transition-colors">
                Go to sign in
              </Link>
            </p>
          </>
        ) : !token ? (
          <>
            <p className="text-[13.5px] text-ink-muted leading-relaxed">
              This reset link is missing its token. Please use the link from your email,
              or request a new one.
            </p>
            <p className="text-center text-[13px] text-ink-muted mt-6">
              <Link to="/forgot-password" className="text-ink hover:text-accent transition-colors">
                Request a new link
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] text-ink-muted mb-1.5 uppercase tracking-wider">New password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 pr-10 text-[13.5px] rounded-lg border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
                  placeholder="At least 8 characters"
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

            <div>
              <label className="block text-[12px] text-ink-muted mb-1.5 uppercase tracking-wider">Confirm password</label>
              <input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 text-[13.5px] rounded-lg border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-[12.5px] text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper rounded-lg py-2.5 text-[14px] font-medium hover:bg-ink-soft transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
