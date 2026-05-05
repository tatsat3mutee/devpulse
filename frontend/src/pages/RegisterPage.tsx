import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err?.message?.includes("409")
        ? "An account with that email already exists."
        : err?.message?.includes("429")
        ? "Too many attempts. Please wait a moment."
        : "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-xl p-8">
        <div className="eyebrow mb-5">Account</div>
        <h1 className="display text-[26px] text-ink mb-6">Create your account</h1>

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
            <label className="block text-[12px] text-ink-muted mb-1.5 uppercase tracking-wider">
              Display name <span className="normal-case tracking-normal text-ink-faint">(optional)</span>
            </label>
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="w-full px-3 py-2.5 text-[13.5px] rounded-lg border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
              placeholder="Tatsat"
            />
          </div>

          <div>
            <label className="block text-[12px] text-ink-muted mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 pr-10 text-[13.5px] rounded-lg border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
                placeholder="Min 8 characters"
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
              className="w-full px-3 py-2.5 text-[13.5px] rounded-lg border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/5"
              placeholder="Repeat password"
            />
          </div>

          {error && <p className="text-[12.5px] text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper rounded-lg py-2.5 text-[14px] font-medium hover:bg-ink-soft transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-[13px] text-ink-muted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-ink hover:text-accent transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
