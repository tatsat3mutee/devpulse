import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      const msg = err?.message?.includes("429")
        ? "Too many attempts. Please wait a moment."
        : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl p-8">
        <div className="eyebrow mb-5">Account</div>
        <h1 className="display text-[26px] text-ink mb-6">Reset your password</h1>

        {sent ? (
          <>
            <p className="text-[13.5px] text-ink-soft leading-relaxed">
              If that email has an account, we sent a reset link.
            </p>
            <p className="text-center text-[13px] text-ink-muted mt-6">
              <Link to="/login" className="text-ink hover:text-accent transition-colors">
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-[13.5px] text-ink-muted leading-relaxed mb-5">
              Enter your email and we'll send you a link to reset your password.
            </p>
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

              {error && <p className="text-[12.5px] text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-paper rounded-lg py-2.5 text-[14px] font-medium hover:bg-ink-soft transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="text-center text-[13px] text-ink-muted mt-6">
              Remembered it?{" "}
              <Link to="/login" className="text-ink hover:text-accent transition-colors">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
