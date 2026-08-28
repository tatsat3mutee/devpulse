import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  AREA_LABELS,
  CONCEPT_AREAS,
  DAY_LABELS,
  type ConceptArea,
  type DeliveryPrefs,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteAccount();
      await logout();
      navigate("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  };

  return (
    <div>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Configuration</div>
        <h1 className="display text-[26px] sm:text-[32px] md:text-[38px] text-ink mb-2">Settings</h1>
        <p className="text-ink-muted text-[14px]">System status, preferences and project information.</p>
      </header>

      <div className="space-y-2">
        <DeliveryCard />

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
            DevPulse reads arXiv, GitHub, Hugging Face, lab engineering blogs and a
            handful of newsrooms, then throws almost all of it away. What survives is a{" "}
            <em>concept</em> — one transferable mechanism you could learn and re-explain.
            Concepts are ranked by durability, not popularity: mechanism density, source
            authority and corroboration decide the order, recency only breaks ties, and an
            unanchored social spike is penalised.
          </p>
        </Card>

        {/* Danger zone — logged-in users only */}
        {user && (
          <Card title="Delete account" eyebrow="Danger zone">
            <p className="text-[13px] text-ink-muted leading-relaxed mb-4">
              Permanently delete your account and all associated data — saved items,
              followed topics, and muted sources. This cannot be undone.
            </p>
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-[13px] font-medium px-4 py-2 rounded-md border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Delete my account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-ink">
                  Are you absolutely sure? This will erase everything tied to{" "}
                  <span className="font-mono text-[12px] break-all">{user.email}</span>.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="text-[13px] font-medium px-4 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
                  >
                    {deleting ? "Deleting…" : "Yes, delete permanently"}
                  </button>
                  <button
                    onClick={() => { setConfirmingDelete(false); setDeleteError(""); }}
                    disabled={deleting}
                    className="text-[13px] px-4 py-2 rounded-md border border-line text-ink-muted hover:text-ink hover:border-ink/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {deleteError && <p className="text-[12px] text-rose-500">{deleteError}</p>}
              </div>
            )}
          </Card>
        )}

        {/* Admin-only section */}
        {user?.isAdmin && (
          <Card title="Admin" eyebrow="Server Config">
            <p className="text-[12px] text-ink-muted mb-3">
              Visible only to the admin account. Configure environment variables in{" "}
              <code className="font-mono text-[11px] bg-paper px-1 py-0.5 rounded">backend/.env</code>.
            </p>
            <div className="divide-y divide-line">
              {[
                { key: "OPENROUTER_API_KEY", label: "OpenRouter - primary chat LLM" },
                { key: "GROQ_API_KEY", label: "Groq - fast classification / fallback" },
                { key: "GEMINI_API_KEY", label: "Gemini - fallback LLM" },
                { key: "OPENAI_API_KEY", label: "OpenAI - fallback LLM" },
                { key: "GITHUB_TOKEN", label: "GitHub - higher rate limits" },
                { key: "TWITTER_BEARER_TOKEN", label: "X/Twitter - tweets" },
                { key: "ADMIN_EMAIL", label: "Admin email" },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-wrap items-center justify-between py-2 first:pt-0 last:pb-0 gap-x-3 gap-y-0.5">
                  <div className="min-w-0">
                    <span className="text-ink-soft font-mono text-[12px] break-all">{key}</span>
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

/**
 * Delivery cadence.
 *
 * `users.serve_days` / `serve_areas` / `email_concepts` shipped with the
 * concepts migration and sane defaults (Tue + Fri, all areas, email on), but
 * nothing exposed them — so the twice-a-week promise was effectively
 * hard-coded. This is the control surface for it.
 */
function DeliveryCard() {
  const [prefs, setPrefs] = useState<DeliveryPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getDeliveryPrefs()
      .then((p) => !cancelled && setPrefs(p))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  async function save(patch: Partial<Omit<DeliveryPrefs, "known_areas">>) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    setSaving(true);
    setError(null);
    try {
      const next = await api.updateDeliveryPrefs(patch);
      setPrefs({ ...prefs, ...patch, ...next });
    } catch (e) {
      // The server rejects an empty schedule or empty area set; roll back so the
      // UI never shows a state the backend refused to store.
      setPrefs(previous);
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card title="Delivery" eyebrow="Concepts">
        <p className="text-[13px] text-ink-muted">Loading…</p>
      </Card>
    );
  }
  if (!prefs) {
    return (
      <Card title="Delivery" eyebrow="Concepts">
        <p className="text-[13px] text-ink-muted">{error ?? "Sign in to set your cadence."}</p>
      </Card>
    );
  }

  const toggleDay = (d: number) => {
    const next = prefs.serve_days.includes(d)
      ? prefs.serve_days.filter((x) => x !== d)
      : [...prefs.serve_days, d].sort((a, b) => a - b);
    save({ serve_days: next });
  };

  const toggleArea = (a: ConceptArea) => {
    const next = prefs.serve_areas.includes(a)
      ? prefs.serve_areas.filter((x) => x !== a)
      : [...prefs.serve_areas, a];
    save({ serve_areas: next });
  };

  const chip = (on: boolean) =>
    `px-2.5 py-1.5 rounded-md text-[12.5px] font-medium border transition-colors disabled:opacity-50 ${
      on
        ? "bg-accent/10 border-accent/30 text-accent"
        : "border-line text-ink-muted hover:text-ink hover:border-ink/25"
    }`;

  return (
    <Card title="Delivery" eyebrow="Concepts">
      <div className="mb-4">
        <p className="text-[13px] text-ink-muted mb-2">Days you get a concept</p>
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map((label, d) => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              disabled={saving}
              aria-pressed={prefs.serve_days.includes(d)}
              className={chip(prefs.serve_days.includes(d))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[13px] text-ink-muted mb-2">Areas you want covered</p>
        <div className="flex flex-wrap gap-1.5">
          {CONCEPT_AREAS.map((a) => (
            <button
              key={a}
              onClick={() => toggleArea(a)}
              disabled={saving}
              aria-pressed={prefs.serve_areas.includes(a)}
              className={chip(prefs.serve_areas.includes(a))}
            >
              {AREA_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      <Row label="Email me each edition">
        <button
          onClick={() => save({ email_concepts: !prefs.email_concepts })}
          disabled={saving}
          role="switch"
          aria-checked={prefs.email_concepts}
          aria-label="Email me each edition"
          className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
            prefs.email_concepts ? "bg-accent" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-paper transition-transform ${
              prefs.email_concepts ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </Row>

      {error && <p className="mt-2 text-[12.5px] text-rose-600">{error}</p>}
    </Card>
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
