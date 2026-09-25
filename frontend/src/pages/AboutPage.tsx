import { NavLink } from "react-router-dom";

const PIPELINE = [
  { step: "Collect", desc: "Feeds, papers, repositories, model hubs and technical communities provide raw material. URL deduplication prevents exact repeats." },
  { step: "Gate", desc: "Candidates must contain enough evidence for a transferable mechanism. Popularity alone is not sufficient, and most items are intentionally rejected." },
  { step: "Extract", desc: "The system identifies the mechanism, why it matters and where the idea transfers. Claims retain links to their source material." },
  { step: "Rank", desc: "Durability favors mechanism density, source authority, corroboration and novelty. Recency breaks ties; unanchored social spikes are penalized." },
  { step: "Serve", desc: "A lead concept and a few shorter mentions are assembled for each due reader twice a week, with coverage tracked across five engineering areas." },
];

export default function AboutPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://devpulse.ai";

  return (
    <article className="max-w-3xl pb-12 [letter-spacing:0]">
      <header className="border-b border-line pb-7 mb-9">
        <p className="font-mono text-[11px] uppercase text-accent mb-3">DevPulse / About</p>
        <h1 className="lesson-heading text-[34px] sm:text-[42px]">An idea engine for AI engineering.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted max-w-2xl">DevPulse turns a noisy stream of papers, repositories and technical discussion into mechanisms an engineer can understand, test and re-explain.</p>
        <p className="mt-4 text-[12px] text-ink-muted">Built by <a href="https://github.com/tatsat3mutee" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Tatsat Pandey</a> / India / since 2025</p>
      </header>

      <section className="mb-10">
        <h2 className="text-[20px] font-medium mb-3">Not another popularity feed</h2>
        <div className="space-y-3 text-[14px] leading-relaxed text-ink-muted">
          <p>The central question is not “what is trending?” It is “does this contain a mechanism worth learning?” A high rejection rate is intentional. Engagement scores remain useful in the raw research feed, but they do not decide what becomes a concept.</p>
          <p>The Edition is the front door: one deeper concept and a few shorter mentions, delivered twice a week. Archive keeps the published corpus searchable; Research exposes the underlying feed when recency is the actual need.</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[20px] font-medium mb-5">How an item becomes an idea</h2>
        <ol className="border-t border-line">
          {PIPELINE.map((entry, index) => <li key={entry.step} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-b border-line py-4">
            <span className="font-mono text-[12px] text-accent">0{index + 1}</span>
            <div><h3 className="text-[14px] font-semibold">{entry.step}</h3><p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{entry.desc}</p></div>
          </li>)}
        </ol>
      </section>

      <section className="mb-10 grid sm:grid-cols-2 gap-6 border-y border-line py-6">
        <div><h2 className="text-[15px] font-semibold mb-2">What is measured</h2><p className="text-[13.5px] leading-relaxed text-ink-muted">Source receipts accompany concepts. Model benchmark history distinguishes no history from no movement.</p></div>
        <div><h2 className="text-[15px] font-semibold mb-2">What is not claimed</h2><p className="text-[13.5px] leading-relaxed text-ink-muted">Concepts are not vendor rankings, live-model benchmarks or proof that a production system will reproduce a reported result.</p></div>
      </section>

      <section className="mb-10">
        <h2 className="text-[20px] font-medium mb-3">Privacy</h2>
        <p className="text-[14px] leading-relaxed text-ink-muted"><strong className="text-accent font-semibold">No trackers, third-party analytics or ads.</strong> Authentication uses an httpOnly cookie. Account data and saved progress can be deleted from <NavLink to="/settings" className="text-accent hover:underline">Settings</NavLink>.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-[20px] font-medium mb-3">Follow the underlying stream</h2>
        <p className="text-[14px] text-ink-muted mb-3">The RSS endpoint remains available for readers who want the raw feed:</p>
        <code className="block border border-line bg-surface rounded-md px-3 py-3 text-[13px] text-accent break-all">{origin}/api/rss</code>
      </section>

      <nav aria-label="About links" className="flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6 text-[13px] text-ink-muted">
        <NavLink to="/edition" className="hover:text-accent">Latest edition</NavLink>
        <NavLink to="/archive" className="hover:text-accent">Concept archive</NavLink>
        <NavLink to="/sources" className="hover:text-accent">All sources</NavLink>
        <NavLink to="/settings" className="hover:text-accent">Settings</NavLink>
      </nav>
    </article>
  );
}
