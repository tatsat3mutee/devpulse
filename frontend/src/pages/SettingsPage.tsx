import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  return (
    <div>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Configuration</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">Settings</h1>
        <p className="text-ink-muted text-[14px]">System status and project information.</p>
      </header>

      <div className="space-y-2">
        {/* Status */}
        <Card title="System Status" eyebrow="Health">
          <Row label="Backend">
            <span className={`inline-flex items-center gap-1.5 ${health ? "text-accent" : "text-rose-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health ? "bg-accent" : "bg-rose-500"}`} />
              {health ? "Connected" : "Disconnected"}
            </span>
          </Row>
          <Row label="Last check">
            <span className="text-ink-soft font-mono text-[12.5px]">
              {health ? new Date(health.timestamp).toLocaleTimeString() : "-"}
            </span>
          </Row>
          <Row label="Fetch interval">
            <span className="text-ink-soft font-mono text-[12.5px]">60 min</span>
          </Row>
        </Card>

        {/* About */}
        <Card title="About" eyebrow="Project">
          <p className="text-[13.5px] text-ink-soft leading-relaxed">
            DevPulse aggregates AI/ML signal from arXiv, GitHub, Reddit, Hacker News,
            Hugging Face, X, LinkedIn and a handful of newsrooms. Items are scored by
            engagement and recency, classified into topics by an LLM (with a keyword
            fallback), and optionally summarised.
          </p>
          <p className="text-[12px] text-ink-faint mt-3">
            Source: <a href="https://github.com/tatsat3mutee/devpulse" target="_blank" rel="noopener" className="text-ink hover:text-accent underline decoration-line">github.com/tatsat3mutee/devpulse</a>
          </p>
        </Card>

        {/* Admin-only section */}
        {user?.isAdmin && (
          <Card title="Admin" eyebrow="Server Config">
            <p className="text-[12px] text-ink-muted mb-3">
              Visible only to the admin account. Configure environment variables in{" "}
              <code className="font-mono text-[11px] bg-paper px-1 py-0.5 rounded">backend/.env</code>.
            </p>
            <div className="divide-y divide-line">
              {[
                { key: "GROQ_API_KEY", label: "Groq - primary LLM" },
                { key: "GEMINI_API_KEY", label: "Gemini - fallback LLM" },
                { key: "OPENAI_API_KEY", label: "OpenAI - fallback LLM" },
                { key: "GITHUB_TOKEN", label: "GitHub - higher rate limits" },
                { key: "TWITTER_BEARER_TOKEN", label: "X/Twitter - tweets" },
                { key: "PERPLEXITY_API_KEY", label: "Perplexity - chat search" },
                { key: "ADMIN_EMAIL", label: "Admin email" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-3">
                  <div>
                    <span className="text-ink-soft font-mono text-[12px]">{key}</span>
                    <span className="text-ink-faint text-[11px] ml-2">{label}</span>
                  </div>
                  <span className="text-ink-faint text-[11px] uppercase tracking-wider shrink-0">.env</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-lg p-5">
      {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
      <h2 className="font-medium text-ink text-[15px] mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <span className="text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

