import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Item, Topic, KnowledgeGuide } from "../lib/api";
import FeedItem from "../components/FeedItem";
import VideoCard from "../components/VideoCard";
import { timeAgo } from "../lib/utils";

export default function DashboardPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topItems, setTopItems] = useState<Item[]>([]);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [videos, setVideos] = useState<Item[]>([]);
  const [guides, setGuides] = useState<KnowledgeGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ topics: 0, items: 0, sources: 0 });

  useEffect(() => {
    Promise.all([
      api.getTopics(),
      api.getItems({ sort: "top", limit: "5" }),
      api.getItems({ sort: "recent", limit: "8" }),
      api.getItems({ type: "video", sort: "recent", limit: "4" }),
      api.getKnowledgeGuides(),
      api.getSources(),
    ]).then(([topicsData, topData, recentData, videoData, guidesData, sourcesData]) => {
      setTopics(topicsData.filter((t) => t.item_count > 0).slice(0, 8));
      setTopItems(topData.items);
      setRecentItems(recentData.items);
      setVideos(videoData.items);
      setGuides(guidesData.slice(0, 4));
      setStats({
        topics: topicsData.length,
        items: topicsData.reduce((s, t) => s + t.item_count, 0),
        sources: sourcesData.length,
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">AI Developer Portal</h1>
        <p className="text-blue-100 text-xs sm:text-sm mb-4">
          Your one-stop hub for AI news, VS Code, Copilot, tutorials, and more
        </p>
        <div className="flex gap-6">
          <Stat label="Topics" value={stats.topics} />
          <Stat label="Items" value={stats.items} />
          <Stat label="Sources" value={stats.sources} />
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <QuickLink to="/devhub" icon="🛠️" label="Dev Hub" color="bg-blue-50 text-blue-700 border-blue-200" />
        <QuickLink to="/videos" icon="🎬" label="AI Videos" color="bg-red-50 text-red-700 border-red-200" />
        <QuickLink to="/knowledge" icon="📖" label="Knowledge" color="bg-purple-50 text-purple-700 border-purple-200" />
        <QuickLink to="/feed" icon="📡" label="Full Feed" color="bg-gray-50 text-gray-700 border-gray-200" />
      </div>

      {/* Top trending */}
      {topItems.length > 0 && (
        <Section title="🔥 Trending" link="/feed?sort=top">
          <div className="space-y-2">
            {topItems.map((item) => (
              <FeedItem key={item.id} item={item} showTopic />
            ))}
          </div>
        </Section>
      )}

      {/* Latest videos */}
      {videos.length > 0 && (
        <Section title="🎬 Latest Videos" link="/videos">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {videos.map((v) => (
              <VideoCard key={v.id} item={v} />
            ))}
          </div>
        </Section>
      )}

      {/* Hot topics */}
      <Section title="🗂️ Hot Topics" link="/topics">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {topics.map((t) => (
            <Link
              key={t.id}
              to={`/topic/${t.slug}`}
              className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.category_color }} />
                <span className="font-semibold text-xs truncate">{t.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t.item_count} items</span>
                {t.latest_item_at && <span>{timeAgo(t.latest_item_at)}</span>}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Knowledge guides */}
      {guides.length > 0 && (
        <Section title="📖 Knowledge Guides" link="/knowledge">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guides.map((g) => (
              <Link
                key={g.id}
                to={`/knowledge/${g.slug}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <span className="text-2xl">{g.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">{g.title}</h3>
                  <span className="text-xs text-gray-400">{g.difficulty} · {g.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Recent items */}
      <Section title="🕐 Recently Added" link="/feed?sort=recent">
        <div className="space-y-2">
          {recentItems.map((item) => (
            <FeedItem key={item.id} item={item} showTopic />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-blue-200 text-xs">{label}</div>
    </div>
  );
}

function QuickLink({ to, icon, label, color }: { to: string; icon: string; label: string; color: string }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border font-medium text-xs sm:text-sm hover:shadow-sm transition-all ${color}`}
    >
      <span className="text-lg shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function Section({ title, link, children }: { title: string; link: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link to={link} className="text-xs text-blue-600 hover:underline">View all →</Link>
      </div>
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      <div className="h-36 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 sm:h-14 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
