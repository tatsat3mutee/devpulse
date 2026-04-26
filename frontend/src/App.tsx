import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TopicsPage from "./pages/TopicsPage";
import TopicDetailPage from "./pages/TopicDetailPage";
import FeedPage from "./pages/FeedPage";
import VideosPage from "./pages/VideosPage";
import DevHubPage from "./pages/DevHubPage";
import KnowledgePage from "./pages/KnowledgePage";
import SourcesPage from "./pages/SourcesPage";
import SettingsPage from "./pages/SettingsPage";
import LearnPage from "./pages/LearnPage";
import HelpPage from "./pages/HelpPage";
import Icon from "./components/Icon";

const navItems = [
  { to: "/", label: "Today", icon: "home" as const },
  { to: "/topics", label: "Topics", icon: "layers" as const },
  { to: "/feed", label: "Feed", icon: "rss" as const },
  { to: "/devhub", label: "Dev Hub", icon: "wrench" as const },
  { to: "/videos", label: "Videos", icon: "play" as const },
  { to: "/knowledge", label: "Knowledge", icon: "book" as const },
  { to: "/learn", label: "Learning", icon: "target" as const },
  { to: "/sources", label: "Sources", icon: "link" as const },
  { to: "/help", label: "Search", icon: "search" as const },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const location = useLocation();

  // ── Dark mode ────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const closeSidebar = () => setSidebarOpen(false);
  const currentLabel = navItems.find(n => n.to === location.pathname)?.label;

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Mobile overlay */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ transform: sidebarOpen || isDesktop ? 'translateX(0)' : 'translateX(-100%)' }}
        className="w-60 bg-surface border-r border-line flex flex-col fixed h-full z-50 transition-transform duration-200"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <NavLink to="/" onClick={closeSidebar} className="group">
            <span className="display text-[24px] text-ink">DevPulse</span>
          </NavLink>
          {!isDesktop && (
            <button
              onClick={closeSidebar}
              className="w-8 h-8 rounded-md flex items-center justify-center text-ink-muted hover:bg-paper hover:text-ink"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <p className="px-5 text-[12px] text-ink-muted leading-snug pb-5 border-b border-line">
          A quiet feed of what's<br/>actually moving in AI.
        </p>
        <nav className="flex flex-col gap-px px-3 py-3 flex-1 overflow-y-auto">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? "bg-ink text-paper"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                }`
              }
            >
              <Icon name={n.icon} size={16} className="shrink-0" />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-line">
          <div className="flex items-center justify-between">
            <NavLink
              to="/settings"
              className="flex items-center gap-2 text-[12px] text-ink-muted hover:text-ink transition-colors"
            >
              <Icon name="settings" size={14} />
              Settings
            </NavLink>
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
            </button>
          </div>
          <p className="text-[10px] text-ink-faint mt-2 font-mono">
            curated · daily · since 2025
          </p>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: isDesktop ? '15rem' : 0 }} className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-paper/80 backdrop-blur border-b border-line flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {!isDesktop && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-9 h-9 -ml-2 rounded-md flex items-center justify-center text-ink-soft hover:bg-surface hover:text-ink"
                aria-label="Menu"
              >
                <Icon name="menu" size={18} />
              </button>
            )}
            {!isDesktop ? (
              <span className="font-medium text-[14px] text-ink">{currentLabel || "DevPulse"}</span>
            ) : (
              <span className="eyebrow">{currentLabel || "DevPulse"}</span>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-9 h-9 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface transition-colors"
            title="Refresh"
            aria-label="Refresh"
          >
            <Icon name="refresh" size={15} />
          </button>
        </header>

        <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/topic/:slug" element={<TopicDetailPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/devhub" element={<DevHubPage />} />
            <Route path="/vscode" element={<DevHubPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/knowledge/:slug" element={<KnowledgePage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </div>

        <footer className="border-t border-line py-8 px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-ink-muted">
            <div className="flex items-center gap-2">
              <span className="display text-[18px] text-ink">DevPulse</span>
              <span className="text-ink-faint">— made in India by Tatsat Pandey.</span>
            </div>
            <div className="flex items-center gap-5">
              <a href="https://github.com/tatsat3mutee/devpulse" target="_blank" rel="noopener" className="hover:text-ink inline-flex items-center gap-1.5">
                <Icon name="github" size={13} /> Source
              </a>
              <NavLink to="/sources" className="hover:text-ink">Sources</NavLink>
              <NavLink to="/settings" className="hover:text-ink">Settings</NavLink>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

