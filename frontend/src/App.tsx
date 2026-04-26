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

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/topics", label: "Topics", icon: "🗂️" },
  { to: "/feed", label: "Feed", icon: "📡" },
  { to: "/devhub", label: "Dev Hub", icon: "🛠️" },
  { to: "/videos", label: "Videos", icon: "🎬" },
  { to: "/knowledge", label: "Knowledge", icon: "📖" },
  { to: "/learn", label: "Learning Paths", icon: "🎯" },
  { to: "/sources", label: "Sources", icon: "🔗" },
  { to: "/help", label: "Help & Search", icon: "💡" },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const location = useLocation();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close sidebar on route change (mobile)
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ transform: sidebarOpen || isDesktop ? 'translateX(0)' : 'translateX(-100%)' }}
        className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full z-50 transition-transform duration-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <NavLink to="/" onClick={closeSidebar} className="flex items-center gap-2 font-bold text-lg">
            <span className="text-xl">⚡</span>
            <span>DevPulse</span>
          </NavLink>
          {!isDesktop && (
            <button
              onClick={closeSidebar}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              ✕
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 text-[10px] text-gray-400">
          DevPulse · AI Developer Portal
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: isDesktop ? '14rem' : 0 }} className="flex-1 min-w-0">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          {!isDesktop && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
              title="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z"/></svg>
            </button>
          )}
          {!isDesktop && (
            <div className="font-semibold text-sm text-gray-700">
              {navItems.find(n => n.to === location.pathname)?.label || "DevPulse"}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            ↻
          </button>
        </header>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
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

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          Built by <span className="text-gray-600 font-medium">Tatsat Pandey</span> · Powered by AI
        </footer>
      </main>
    </div>
  );
}
