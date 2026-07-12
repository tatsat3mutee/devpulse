export default function PrivacyPage() {
  return (
    <div className="max-w-2xl">
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Legal</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">Privacy Policy</h1>
        <p className="text-ink-muted text-[13px]">Last updated: July 2026</p>
      </header>

      <div className="space-y-8 text-[14px] text-ink-soft leading-relaxed">
        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">What we collect</h2>
          <p>
            DevPulse works without an account. If you browse anonymously, we store your
            preferences (theme, role, bookmarks, language, event country) in your browser's
            local storage — that data never leaves your device.
          </p>
          <p className="mt-2">
            If you create an account, we store your email address, an encrypted password hash
            (or your OAuth identity from Google/GitHub), your display name, and your in-app
            activity: saved items, followed topics, and muted sources.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">Cookies</h2>
          <p>
            We use a single httpOnly authentication cookie to keep you signed in. There are no
            advertising trackers, no third-party analytics cookies, and no cross-site tracking.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">Email</h2>
          <p>
            If you subscribe to the digest, we use your email only to send it. Every email
            includes an unsubscribe link. We never sell or share your email address.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">AI features</h2>
          <p>
            Chat messages are sent to third-party LLM providers (such as OpenRouter or Groq) to
            generate responses. Don't include sensitive personal information in chat messages.
            We don't use your messages to train models.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">Deleting your data</h2>
          <p>
            You can permanently delete your account and all associated data at any time from
            Settings → Delete account. Deletion is immediate and irreversible. Local bookmarks
            can be cleared from your browser at any time.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-ink text-[16px] mb-2">Contact</h2>
          <p>
            Questions? Open an issue on{" "}
            <a
              href="https://github.com/tatsat3mutee/devpulse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
