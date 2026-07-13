export default function TermsPage() {
  return (
    <div className="max-w-2xl">
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Legal</div>
        <h1 className="display text-[26px] sm:text-[32px] md:text-[38px] text-ink mb-2">Terms of Use</h1>
        <p className="text-ink-muted text-[13px]">Last updated: July 2026</p>
      </header>

      <div className="space-y-8 text-[14px] text-ink-soft leading-relaxed">
        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">The service</h2>
          <p>
            DevPulse is a free content aggregator for AI and developer news. Content is
            collected from public sources (arXiv, GitHub, Hacker News, YouTube, RSS feeds and
            others) and remains the property of its original authors and platforms. Links
            always point to the original source.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">No warranties</h2>
          <p>
            The service is provided "as is", without warranty of any kind. Summaries, scores,
            classifications, and chat answers are generated automatically (including by AI
            models) and may be inaccurate or incomplete. Always verify important information
            with the original source.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">Acceptable use</h2>
          <p>
            Don't abuse the service: no scraping at rates that degrade it for others, no
            attempts to gain unauthorized access, and no use of the chat feature to generate
            harmful content. We may suspend accounts that violate these rules.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">Your account</h2>
          <p>
            You're responsible for keeping your credentials secure. You can delete your account
            and all associated data at any time from Settings.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">Changes</h2>
          <p>
            We may update these terms as the service evolves. Material changes will be noted on
            this page with an updated date.
          </p>
        </section>
      </div>
    </div>
  );
}
