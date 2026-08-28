import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

/**
 * Both the edition email footer and the welcome email have always linked here.
 * Until now the route didn't exist and the link fell through to the 404 page —
 * an unsubscribe link that cannot unsubscribe.
 */
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("working");
    try {
      await api.unsubscribe(email.trim());
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="max-w-lg py-8">
        <h1 className="display text-[26px] text-ink mb-3">Unsubscribed</h1>
        <p className="text-[15px] leading-relaxed text-ink-muted mb-6">
          You won't get any more emails from DevPulse. Your concepts are still on the site
          if you want them.
        </p>
        <Link to="/" className="text-[13px] font-medium text-accent hover:underline">
          Back to DevPulse →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg py-8">
      <h1 className="display text-[26px] text-ink mb-3">Unsubscribe</h1>
      <p className="text-[15px] leading-relaxed text-ink-muted mb-6">
        Enter the address you're receiving concepts at and we'll stop sending them.
      </p>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 px-3 py-2.5 rounded-lg border border-line bg-surface text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/30"
        />
        <button
          type="submit"
          disabled={status === "working"}
          className="px-4 py-2.5 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft disabled:opacity-50 transition-colors shrink-0"
        >
          {status === "working" ? "Working…" : "Unsubscribe"}
        </button>
      </form>

      {status === "error" && (
        <p className="mt-3 text-[13px] text-ink-muted">{message}</p>
      )}
    </div>
  );
}
