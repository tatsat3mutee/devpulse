import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useRole, ROLES, type DevRole } from "../components/RoleSelector";

export default function SettingsPage() {
  const { user, followedTopicIds, mutedSourceIds, unfollowTopic, unmuteSource, refreshPrefs, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [followedList, setFollowedList] = useState<{ topic_id: number; name: string; slug: string }[]>([]);
  const [mutedList, setMutedList] = useState<{ source_id: number; name: string }[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { role, setRole } = useRole();

  const handleRole = (r: DevRole) => {
    setRole(r);
    if (user) api.updateRole(r).catch(() => {});
  };

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api.getPrefs().then(prefs => {
      setFollowedList(prefs.followed_topics);
      setMutedList(prefs.muted_sources);
    }).catch(() => {});
  }, [user, followedTopicIds, mutedSourceIds]);

  const handleUnfollow = async (topicId: number) => {
    await unfollowTopic(topicId);
    setFollowedList(prev => prev.filter(t => t.topic_id !== topicId));
    await refreshPrefs();
  };

  const handleUnmute = async (sourceId: number) => {
    await unmuteSource(sourceId);
    setMutedList(prev => prev.filter(s => s.source_id !== sourceId));
    await refreshPrefs();
  };

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
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">Settings</h1>
        <p className="text-ink-muted text-[14px]">System status, preferences and project information.</p>
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

        {/* Role personalisation — works for everyone (stored locally, synced when signed in) */}
        <Card title="Your role" eyebrow="Personalisation">
          <p className="text-[12.5px] text-ink-muted mb-3">
            We highlight the topics most relevant to your role across the feed and topics pages.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROLES.map(({ value, label, icon, description }) => (
              <button
                key={value}
                onClick={() => handleRole(value)}
                className={`text-left px-3.5 py-3 rounded-lg border transition-all ${
                  role === value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line hover:border-ink/25 hover:bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px]">{icon}</span>
                  <span className="font-medium text-[13px]">{label}</span>
                </div>
                <p className="text-[11.5px] text-ink-muted leading-relaxed">{description}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Preferences — logged-in users only */}
        {user && (
          <Card title="Preferences" eyebrow="Personalisation">
            <div className="space-y-4">
              <div>
                <p className="text-[12.5px] font-medium text-ink-soft mb-2">Followed topics</p>
                {followedList.length === 0 ? (
                  <p className="text-[12.5px] text-ink-faint">
                    No topics followed yet.{" "}
                    <Link to="/topics" className="text-accent hover:underline">Browse topics →</Link>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {followedList.map(t => (
                      <span
                        key={t.topic_id}
                        className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-accent/8 border border-accent/20 text-accent"
                      >
                        <Link to={`/topic/${t.slug}`} className="hover:underline">{t.name}</Link>
                        <button
                          onClick={() => handleUnfollow(t.topic_id)}
                          className="text-accent/60 hover:text-accent transition-colors leading-none"
                          aria-label={`Unfollow ${t.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-[12.5px] font-medium text-ink-soft mb-2">Muted sources</p>
                {mutedList.length === 0 ? (
                  <p className="text-[12.5px] text-ink-faint">No sources muted. Use the ··· menu on any feed item to mute a source.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mutedList.map(s => (
                      <span
                        key={s.source_id}
                        className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-rose-500/8 border border-rose-500/20 text-rose-600 dark:text-rose-400"
                      >
                        {s.name}
                        <button
                          onClick={() => handleUnmute(s.source_id)}
                          className="opacity-60 hover:opacity-100 transition-opacity leading-none"
                          aria-label={`Unmute ${s.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* About */}
        <Card title="About" eyebrow="Project">
          <p className="text-[13.5px] text-ink-soft leading-relaxed">
            DevPulse aggregates AI/ML signal from arXiv, GitHub, Reddit, Hacker News,
            Hugging Face, X, LinkedIn and a handful of newsrooms. Items are scored by
            engagement and recency, classified into topics by an LLM (with a keyword
            fallback), and optionally summarised.
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
                  <span className="font-mono text-[12px]">{user.email}</span>.
                </p>
                <div className="flex items-center gap-2">
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
