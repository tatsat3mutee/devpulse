import { useEffect, useState } from "react";
// import { api } from "../lib/api";
// import Icon from "../components/Icon";

/**
 * {{PageName}}Page — {{SHORT_DESCRIPTION}}
 */
export default function {{PageName}}Page() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Replace with actual data fetching:
    // api.getItems().then(res => { ... }).finally(() => setLoading(false));
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────── */}
      <header className="mb-8 pb-4 border-b border-line">
        <div className="eyebrow mb-2">{{SECTION_LABEL}}</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">
          {{PAGE_TITLE}}
        </h1>
        <p className="text-ink-muted text-[14px] max-w-xl">
          {{PAGE_DESCRIPTION}}
        </p>
      </header>

      {/* ── Loading state ──────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-line rounded-lg p-5 animate-pulse"
            >
              <div className="h-4 bg-paper rounded w-1/3 mb-3" />
              <div className="h-3 bg-paper rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        /* ── Content ─────────────────────────────────── */
        <div className="grid gap-4">
          {/* Replace with actual content cards */}
          <div
            className="bg-surface border border-line rounded-lg p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <h2 className="text-[15px] font-semibold text-ink mb-1">
              Card Title
            </h2>
            <p className="text-[13px] text-ink-muted">
              Card description goes here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
