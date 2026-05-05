import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Item } from "../lib/api";

const SOURCES = [
  { label: "arXiv", color: "bg-purple-500/15 text-purple-400" },
  { label: "GitHub", color: "bg-emerald-500/15 text-emerald-400" },
  { label: "Hacker News", color: "bg-orange-500/15 text-orange-400" },
  { label: "Hugging Face", color: "bg-yellow-500/15 text-yellow-400" },
  { label: "Reddit", color: "bg-red-500/15 text-red-400" },
];

export default function LandingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [subEmail, setSubEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");

  useEffect(() => {
    api.getItems({ sort: "top", limit: "6" }).then(({ items }) => setItems(items)).catch(() => {});
  }, []);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubStatus("loading");
    try {
      const res = await api.subscribe(subEmail.trim());
      setSubStatus("ok");
      setSubMsg(res.message ?? "Subscribed!");
      setSubEmail("");
    } catch (err: unknown) {
      setSubStatus("error");
      const msg = err instanceof Error ? err.message : "Subscription failed.";
      setSubMsg(msg);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-line max-w-5xl mx-auto w-full">
        <span className="font-semibold text-ink text-[15px] tracking-tight">DevPulse</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-[13px] text-ink-muted hover:text-ink transition-colors">Sign in</Link>
          <Link
            to="/feed"
            className="text-[13px] font-medium bg-ink text-paper px-3.5 py-1.5 rounded-md hover:bg-ink-soft transition-colors"
          >
            Open feed
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 sm:py-24">
        <div className="max-w-2xl mb-16">
          <div className="eyebrow mb-4">AI developer signal, unified</div>
          <h1 className="display text-[42px] sm:text-[56px] text-ink leading-[1.1] mb-6">
            Every important AI move,<br />
            <span className="italic text-ink-soft">before your standup.</span>
          </h1>
          <p className="text-[16px] text-ink-muted leading-relaxed mb-8 max-w-xl">
            Papers, repos, releases and discussions - pulled from arXiv, GitHub Trending,
            Hacker News, Hugging Face, and Reddit. Ranked by signal, not by recency.
            No account needed.
          </p>

          {/* Source pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {SOURCES.map(({ label, color }) => (
              <span key={label} className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${color}`}>
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-paper text-[14px] font-medium rounded-md hover:bg-accent/90 transition-colors"
            >
              Open feed - no account needed
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-line text-ink text-[14px] rounded-md hover:border-ink/30 hover:bg-surface transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Live feed preview */}
        {items.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Live right now</p>
              <Link to="/feed" className="text-[12px] text-accent hover:underline">
                See all →
              </Link>
            </div>
            <div className="space-y-px border border-line rounded-lg overflow-hidden">
              {items.map((item) => (
                <PreviewItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Value props */}
        <div className="grid sm:grid-cols-3 gap-4 mt-16">
          {[
            {
              title: "No account, ever",
              body: "Browse everything without signing up. Create an account only if you want to save items across devices.",
            },
            {
              title: "10+ sources, one view",
              body: "arXiv papers, GitHub trending repos, HN threads, Hugging Face model drops - all ranked together by real signal.",
            },
            {
              title: "AI niche only",
              body: "Not general tech news. Not consumer AI. Just the models, tools, and techniques developers actually build with.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="bg-surface border border-line rounded-lg p-5">
              <p className="font-medium text-ink text-[14px] mb-2">{title}</p>
              <p className="text-[13px] text-ink-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Email digest CTA */}
        <section className="mt-16 border border-line rounded-xl p-8 text-center bg-surface">
          <h2 className="font-semibold text-ink text-[17px] mb-2">Get the weekly digest</h2>
          <p className="text-[13.5px] text-ink-muted mb-6 max-w-sm mx-auto leading-relaxed">
            Top papers, repos, and releases - curated every week, straight to your inbox. No spam.
          </p>
          {subStatus === "ok" ? (
            <p className="text-accent font-medium text-[13.5px]">✓ {subMsg}</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 text-[13.5px] bg-paper border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/30 text-ink placeholder:text-ink-faint"
              />
              <button
                type="submit"
                disabled={subStatus === "loading"}
                className="px-5 py-2.5 bg-accent text-paper text-[13.5px] font-medium rounded-md hover:bg-accent/90 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                {subStatus === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}
          {subStatus === "error" && (
            <p className="mt-2 text-red-400 text-[12px]">{subMsg}</p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-5 max-w-5xl mx-auto w-full flex items-center justify-between gap-4 flex-wrap">
        <span className="text-[12px] text-ink-faint">DevPulse · Open source AI developer feed</span>
        <div className="flex gap-4">
          <a
            href="https://github.com/tatsat3mutee/devpulse"
            target="_blank"
            rel="noopener"
            className="text-[12px] text-ink-faint hover:text-ink transition-colors"
          >
            GitHub
          </a>
          <Link to="/sources" className="text-[12px] text-ink-faint hover:text-ink transition-colors">
            Sources
          </Link>
        </div>
      </footer>
    </div>
  );
}

function PreviewItem({ item }: { item: Item }) {
  const PLATFORM_COLORS: Record<string, string> = {
    arxiv: "bg-purple-500/15 text-purple-400",
    github: "bg-emerald-500/15 text-emerald-400",
    "hacker news": "bg-orange-500/15 text-orange-400",
    huggingface: "bg-yellow-500/15 text-yellow-400",
    reddit: "bg-red-500/15 text-red-400",
  };
  const colorClass = PLATFORM_COLORS[item.platform?.toLowerCase() ?? ""] ?? "bg-line text-ink-faint";

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 bg-surface hover:bg-paper transition-colors group"
    >
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${colorClass}`}>
        {item.platform}
      </span>
      <span className="text-[13.5px] text-ink group-hover:text-accent transition-colors leading-snug line-clamp-2">
        {item.title}
      </span>
    </a>
  );
}
