import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import TodayPage from "./pages/TodayPage";
import Icon from "./components/Icon";
import CommandPalette from "./components/CommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Code-split everything except the front door — keeps the initial bundle small.
const CoveragePage = lazy(() => import("./pages/CoveragePage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const ConceptPage = lazy(() => import("./pages/ConceptPage"));
const ModelsPage = lazy(() => import("./pages/ModelsPage"));
const SourcesPage = lazy(() => import("./pages/SourcesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function PageFallback() {
  return (
    <div className="space-y-4 animate-pulse py-4">
      <div className="h-3 w-24 bg-surface rounded" />
      <div className="h-10 w-2/3 bg-surface rounded" />
      <div className="h-4 w-full max-w-md bg-surface rounded" />
      <div className="h-28 bg-surface border border-line rounded-xl" />
      <div className="h-28 bg-surface border border-line rounded-xl" />
    </div>
  );
}

/**
 * Three entries, on purpose.
 *
 * The previous nav had nine, and the dashboard fired seven parallel API calls
 * across six sections — every visit demanded a decision about what to read, and
 * that decision cost is why the product went unused. Artifact died of
 * incoherence via addition; the discipline here is to keep the front door
 * singular and let everything else be somewhere you go deliberately.
 */
const navItems = [
  { to: "/", label: "Today", icon: "spark" as const },
  { to: "/coverage", label: "Coverage", icon: "layers" as const },
  { to: "/archive", label: "Archive", icon: "book" as const },
];

function UserBadge() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <NavLink
        to="/login"
        className="text-[12px] font-medium text-ink-muted hover:text-ink transition-colors px-3 py-1.5 rounded-md border border-line hover:border-ink/30 hover:bg-surface"
      >
        Sign in
      </NavLink>
    );
  }

  const initials = (user.displayName || user.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-7 h-7 rounded-full bg-ink text-paper text-[11px] font-medium flex items-center justify-center hover:bg-ink-soft transition-colors"
        title={user.displayName || user.email}
      >
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-surface border border-line rounded-lg shadow-card w-44 py-1 text-[13px]">
            <div className="px-3 py-2 border-b border-line">
              <p className="font-medium text-ink truncate">{user.displayName || "User"}</p>
              <p className="text-ink-faint text-[11px] truncate">{user.email}</p>
            </div>
            <NavLink
              to="/library"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-ink-soft hover:text-ink hover:bg-paper transition-colors"
            >
              <Icon name="bookmark" size={13} /> Saved
            </NavLink>
            <NavLink
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-ink-soft hover:text-ink hover:bg-paper transition-colors"
            >
              <Icon name="settings" size={13} /> Settings
            </NavLink>
            <div className="border-t border-line mt-1 pt-1">
              <button
                onClick={async () => { setOpen(false); await logout(); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-ink-muted hover:text-ink hover:bg-paper transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const location = useLocation();

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const closeSidebar = () => setSidebarOpen(false);
  const currentLabel = navItems.find(n => n.to === location.pathname)?.label;

  // Per-page document titles for SEO / tab clarity
  useEffect(() => {
    document.title = currentLabel
      ? `${currentLabel} · DevPulse`
      : "DevPulse - one AI idea, twice a week";
  }, [currentLabel, location.pathname]);

  return (
    <div className="min-h-screen flex bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-3 focus:py-2 focus:bg-ink focus:text-paper focus:rounded-md focus:text-[13px]"
      >
        Skip to content
      </a>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        style={{ transform: sidebarOpen || isDesktop ? 'translateX(0)' : 'translateX(-100%)' }}
        className="w-56 bg-surface border-r border-line flex flex-col fixed h-full z-50 transition-transform duration-200"
      >
        {/* Wordmark */}
        <div className="flex items-center justify-between px-4 pt-5 pb-5">
          <NavLink to="/" onClick={closeSidebar} className="flex items-center gap-2.5 group">
            <img src="/icon.svg" alt="" className="w-6 h-6 shrink-0" />
            <span className="wordmark text-[21px] leading-none">
              <span className="text-ink">Dev</span><span className="text-accent">Pulse</span>
            </span>
          </NavLink>
          {!isDesktop && (
            <button
              onClick={closeSidebar}
              aria-label="Close sidebar"
              className="w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:bg-paper hover:text-ink"
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-ink-muted hover:bg-paper hover:text-ink"
                }`
              }
            >
              <Icon name={n.icon} size={15} className="shrink-0" />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-line">
          <div className="flex items-center justify-between mb-3">
            <NavLink
              to="/sources"
              className="text-[11.5px] text-ink-faint hover:text-ink transition-colors"
            >
              Sources
            </NavLink>
            <button
              onClick={toggleTheme}
              className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={13} />
            </button>
          </div>
          <p className="text-[10px] text-ink-faint font-mono tracking-wide">
            made in India · since 2025
          </p>
        </div>
      </aside>

      <main style={{ marginLeft: isDesktop ? '14rem' : 0 }} className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 bg-paper/90 backdrop-blur-md border-b border-line flex items-center justify-between gap-2 px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {!isDesktop && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-9 h-9 -ml-2 rounded-md flex items-center justify-center text-ink-soft hover:bg-surface hover:text-ink shrink-0"
                aria-label="Menu"
              >
                <Icon name="menu" size={18} />
              </button>
            )}
            {!isDesktop ? (
              <NavLink to="/" className="flex items-center gap-2 min-w-0">
                <img src="/icon.svg" alt="" className="w-5 h-5 shrink-0" />
                <span className="wordmark text-[16px] leading-none shrink-0">
                  <span className="text-ink">Dev</span><span className="text-accent">Pulse</span>
                </span>
                {currentLabel && (
                  <>
                    <span className="text-ink-faint/40 text-[13px] shrink-0">/</span>
                    <span className="text-[13px] text-ink-muted truncate">{currentLabel}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <span className="eyebrow">{currentLabel || "DevPulse"}</span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={openPalette}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-surface text-ink-muted text-[12px] hover:border-ink/30 hover:text-ink transition-colors"
            >
              <Icon name="search" size={13} />
              <span>Search</span>
              <kbd className="ml-2 px-1 py-0.5 rounded bg-paper border border-line text-[9px] font-mono text-ink-faint">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={openPalette}
              className="sm:hidden w-9 h-9 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface transition-colors"
              aria-label="Search"
            >
              <Icon name="search" size={15} />
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-9 h-9 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface transition-colors"
              title="Refresh"
              aria-label="Refresh"
            >
              <Icon name="refresh" size={15} />
            </button>
            <UserBadge />
          </div>
        </header>

        <div id="main" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/coverage" element={<CoveragePage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/concept/:slug" element={<ConceptPage />} />

            {/* Off-nav but kept: reachable deliberately, not competing for attention. */}
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/help" element={<HelpPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />

            {/* Retired surfaces — redirect rather than 404 so old links and
                bookmarks land somewhere useful. */}
            <Route path="/feed" element={<Navigate to="/archive" replace />} />
            <Route path="/brief" element={<Navigate to="/" replace />} />
            <Route path="/topics" element={<Navigate to="/coverage" replace />} />
            <Route path="/topic/:slug" element={<Navigate to="/archive" replace />} />
            <Route path="/knowledge" element={<Navigate to="/archive" replace />} />
            <Route path="/knowledge/:slug" element={<Navigate to="/archive" replace />} />
            <Route path="/learn" element={<Navigate to="/archive" replace />} />
            <Route path="/trending" element={<Navigate to="/archive" replace />} />
            <Route path="/videos" element={<Navigate to="/archive" replace />} />
            <Route path="/events" element={<Navigate to="/archive" replace />} />
            <Route path="/devhub" element={<Navigate to="/archive" replace />} />
            <Route path="/vscode" element={<Navigate to="/archive" replace />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </div>

        <footer className="border-t border-line py-8 px-4 sm:px-6 mb-16 lg:mb-0">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-ink-muted">
            <div className="flex flex-wrap items-center gap-2.5">
              <img src="/icon.svg" alt="" className="w-5 h-5" />
              <span className="wordmark text-[17px] text-ink">DevPulse</span>
              <span className="text-ink-faint">- made in India by Tatsat Pandey.</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <NavLink to="/about" className="hover:text-ink">About</NavLink>
              <NavLink to="/privacy" className="hover:text-ink">Privacy</NavLink>
              <NavLink to="/terms" className="hover:text-ink">Terms</NavLink>
              <NavLink to="/sources" className="hover:text-ink">Sources</NavLink>
              <a href="/api/rss" target="_blank" rel="noopener noreferrer" className="hover:text-ink">RSS</a>
              <NavLink to="/settings" className="hover:text-ink">Settings</NavLink>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile bottom nav */}
      {!isDesktop && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur border-t border-line flex items-stretch lg:hidden">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors ${
                  isActive ? "text-accent" : "text-ink-faint hover:text-ink"
                }`
              }
            >
              <Icon name={n.icon} size={20} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
