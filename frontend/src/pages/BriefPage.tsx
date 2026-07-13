import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Brief } from "../lib/api";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";

const BRIEF_LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "hi", label: "हिन्दी" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

export default function BriefPage() {
  const { user } = useAuth();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState<string>(() => localStorage.getItem("devpulse:briefLang") || "en");
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [viewDate, setViewDate] = useState<string>(""); // "" = today

  function load() {
    setLoading(true);
    setError("");
    api.getBrief(lang, viewDate || undefined)
      .then(setBrief)
      .catch(() => {
        setBrief(null);
        setError(viewDate ? "No brief archived for that date." : "Failed to load the brief.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [lang, viewDate]);

  useEffect(() => {
    api.getBriefArchive().then(({ dates }) => setArchiveDates(dates)).catch(() => {});
  }, []);

  const handleLangChange = (code: string) => {
    localStorage.setItem("devpulse:briefLang", code);
    setLang(code);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const b = await api.refreshBrief(lang);
      setBrief(b);
    } catch {
      setError("Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse space-y-5">
        <div className="h-3 w-28 bg-line rounded" />
        <div className="h-10 w-2/3 bg-line/70 rounded" />
        <div className="h-4 w-40 bg-line/50 rounded" />
        <div className="h-20 bg-line/40 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-line rounded-lg p-5 space-y-2">
            <div className="h-3 w-20 bg-line rounded" />
            <div className="h-4 w-full bg-line/60 rounded" />
            <div className="h-4 w-5/6 bg-line/50 rounded" />
            <div className="h-4 w-4/6 bg-line/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !brief) {
    return (
      <div className="text-center py-20">
        <p className="display text-[28px] text-ink-soft mb-2">Brief unavailable.</p>
        <p className="text-[13.5px] text-ink-muted mb-4">{error}</p>
        <div className="flex items-center justify-center gap-2">
          {viewDate && (
            <button
              onClick={() => setViewDate("")}
              className="px-4 py-2 text-[13px] font-medium rounded-lg bg-ink text-paper hover:bg-ink-soft transition-colors"
            >
              Back to today
            </button>
          )}
          <button
            onClick={load}
            className="px-4 py-2 text-[13px] font-medium rounded-lg border border-line hover:border-ink/30 hover:text-ink text-ink-muted transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!brief || (brief.sections.length === 0 && !brief.intro)) {
    return (
      <div className="text-center py-20">
        <p className="display text-[28px] text-ink-soft mb-1">Nothing yet today.</p>
        <p className="text-[13.5px] text-ink-muted">Check back after the next fetch cycle.</p>
      </div>
    );
  }

  const date = new Date(brief.date + "T12:00:00").toLocaleDateString(lang === "en" ? "en-US" : lang, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl">
      {/* Masthead */}
      <header className="mb-8 pb-6 border-b-2 border-ink/80">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <div className="eyebrow mb-2">Morning Brief</div>
            <h1 className="display text-[32px] sm:text-[44px] md:text-[52px] text-ink leading-none mb-2">
              DevPulse Daily
            </h1>
            <p className="text-[12.5px] text-ink-muted font-mono tracking-wide">{date}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:mt-2">
            {archiveDates.length > 0 && (
              <select
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
                title="Past briefs"
                className="text-[12px] bg-surface border border-line rounded-md px-2 py-1.5 text-ink-muted hover:text-ink hover:border-ink/30 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
              >
                <option value="">Today</option>
                {archiveDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              title="Brief language"
              className="text-[12px] bg-surface border border-line rounded-md px-2 py-1.5 text-ink-muted hover:text-ink hover:border-ink/30 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
            >
              {BRIEF_LANGS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            {user?.isAdmin && !viewDate && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Regenerate brief"
                className="w-8 h-8 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface transition-colors disabled:opacity-40"
              >
                <Icon name="refresh" size={15} className={refreshing ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Intro paragraph */}
      {brief.intro && (
        <p className="text-[15px] leading-relaxed text-ink mb-10 border-l-[3px] border-ink/20 pl-4 italic">
          {brief.intro}
        </p>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {brief.sections.map((section, i) => (
          <section key={section.slug} className="border-b border-line pb-8 last:border-0 last:pb-0">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-mono text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              <Link
                to={`/topic/${section.slug}`}
                className="text-[11px] uppercase tracking-widest font-semibold text-accent hover:underline"
              >
                {section.topic}
              </Link>
            </div>

            {/* AI summary */}
            {section.summary && (
              <p className="text-[14px] text-ink-soft leading-relaxed mb-4 pl-4 sm:pl-8">{section.summary}</p>
            )}

            {/* Items */}
            <ol className="space-y-2.5 pl-4 sm:pl-8">
              {section.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span className="text-[11px] font-mono text-ink-faint shrink-0 mt-0.5">{j + 1}.</span>
                  <div className="min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-ink hover:text-accent transition-colors leading-snug font-medium"
                    >
                      {item.title}
                    </a>
                    <span className="inline-block ml-2 text-[10.5px] text-ink-faint font-mono capitalize">
                      {item.platform}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-line flex items-center justify-between text-[11px] text-ink-faint font-mono">
        <span>
          {brief.generated
            ? `AI-curated · ${brief.generated_at ? new Date(brief.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}`
            : "Keyword-ranked"}
        </span>
        <Link to="/" className="hover:text-ink transition-colors flex items-center gap-1">
          <Icon name="home" size={11} /> Back to feed
        </Link>
      </div>
    </div>
  );
}
