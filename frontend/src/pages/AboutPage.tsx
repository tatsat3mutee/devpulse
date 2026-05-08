import { NavLink } from "react-router-dom";

const SOURCES = [
  {
    name: "arXiv AI/ML",
    url: "https://arxiv.org/list/cs.AI/recent",
    desc: "Daily preprints from top AI researchers worldwide. Covers LLMs, computer vision, RL, agents, and more.",
    refresh: "6 h",
  },
  {
    name: "Hacker News",
    url: "https://news.ycombinator.com",
    desc: "Tech community discussions and Show HN posts. Items filtered by upvotes and relevance to AI/ML topics.",
    refresh: "6 h",
  },
  {
    name: "HuggingFace Hub",
    url: "https://huggingface.co",
    desc: "New model releases and trending datasets on the world's largest open-source AI model hub.",
    refresh: "6 h",
  },
  {
    name: "GitHub Trending",
    url: "https://github.com/trending/python",
    desc: "Fastest-growing AI/ML repositories. Filtered to Python/Jupyter notebooks with ML-related keywords.",
    refresh: "6 h",
  },
  {
    name: "r/MachineLearning",
    url: "https://reddit.com/r/MachineLearning",
    desc: "Academic and industry ML discussion from researchers and practitioners.",
    refresh: "6 h",
  },
  {
    name: "r/LocalLLaMA",
    url: "https://reddit.com/r/LocalLLaMA",
    desc: "Hands-on community for running LLMs locally. Models, benchmarks, hardware tips, and fine-tuning guides.",
    refresh: "6 h",
  },
];

const RANKING_STEPS = [
  {
    step: "Fetch",
    desc: "Raw items pulled from each source feed every 6 hours. URL-based deduplication merges cross-source reposts.",
  },
  {
    step: "Community signal",
    desc: "HN points, GitHub stars, Reddit upvotes, and HuggingFace downloads are normalised to a 0–1 score per source.",
  },
  {
    step: "AI relevance",
    desc: 'Groq llama-3.1-8b-instant rates each title 0–100: "Rate 0–100 how relevant this is to AI/ML research and development: {title}. Return only the number."',
  },
  {
    step: "Composite score",
    desc: "Final score = (community_signal × 0.40) + (recency × 0.30) + (ai_relevance / 100 × 0.30). Recency decays over 48 h.",
  },
  {
    step: "Source balance",
    desc: "Each source contributes at most 30 % of the feed to prevent any single source from dominating Today.",
  },
];

export default function AboutPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://devpulse.ai";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: "3rem" }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.25rem" }}>About DevPulse</h1>
      <p style={{ color: "var(--ink-muted)", marginBottom: "2.5rem", fontSize: "0.875rem" }}>
        Built by{" "}
        <a
          href="https://github.com/tatsat3mutee"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          Tatsat Pandey
        </a>{" "}
        · India · since 2025
      </p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)" }}>What is DevPulse?</h2>
        <p style={{ color: "var(--ink-soft)", lineHeight: 1.75, fontSize: "0.9rem", margin: 0 }}>
          DevPulse is a curated AI/ML news aggregator. It pulls from 6 sources every 6 hours, ranks items using a
          Groq-powered LLM (llama-3.1-8b-instant), and surfaces the most important developments in your feed — not
          just the most recent. The Chat tab lets you ask follow-up questions about today's top items using the same
          Groq model. No paywalls, no tracking, no ads.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)" }}>Sources</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {SOURCES.map((s) => (
            <div
              key={s.name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "0.8rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--accent)", textDecoration: "none" }}
                >
                  {s.name}
                </a>
                <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)", fontFamily: "var(--font-mono)", background: "var(--paper)", padding: "0.15rem 0.4rem", borderRadius: 4, border: "1px solid var(--line)" }}>
                  ↻ {s.refresh}
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)" }}>How items are ranked</h2>
        <ol style={{ paddingLeft: "1.2rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {RANKING_STEPS.map((r) => (
            <li key={r.step} style={{ fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.65 }}>
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{r.step}: </strong>
              {r.desc}
            </li>
          ))}
        </ol>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)" }}>Privacy</h2>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "0.9rem 1.1rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", margin: 0, lineHeight: 1.7 }}>
            <span style={{ color: "#22c55e", fontWeight: 600 }}>No trackers. No Google Analytics. No ads.</span>{" "}
            DevPulse uses a single httpOnly JWT cookie for auth. No third-party analytics scripts are loaded. The only data
            stored when you sign up is your email and display name. You can delete your account and all data at any time
            from{" "}
            <NavLink to="/settings" style={{ color: "var(--accent)", textDecoration: "none" }}>
              Settings
            </NavLink>
            .
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)" }}>RSS feed</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-soft)", marginBottom: "0.5rem" }}>
          Subscribe in any RSS reader (Feedly, NetNewsWire, Reeder, etc):
        </p>
        <code
          style={{
            display: "block",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "0.65rem 0.85rem",
            fontSize: "0.82rem",
            fontFamily: "var(--font-mono)",
            color: "var(--accent)",
            wordBreak: "break-all",
          }}
        >
          {origin}/api/rss
        </code>
      </section>

      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: "1.5rem",
          display: "flex",
          gap: "1.5rem",
          fontSize: "0.82rem",
          flexWrap: "wrap",
        }}
      >
        <NavLink to="/sources" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>
          All Sources
        </NavLink>
        <NavLink to="/settings" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>
          Settings
        </NavLink>
        <NavLink to="/" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>
          ← Today's feed
        </NavLink>
      </div>
    </div>
  );
}
