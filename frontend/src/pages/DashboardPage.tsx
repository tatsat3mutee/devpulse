import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Item, Topic, KnowledgeGuide } from "../lib/api";
import FeedItem from "../components/FeedItem";
import VideoCard from "../components/VideoCard";
import Icon from "../components/Icon";
import { timeAgo } from "../lib/utils";

export default function DashboardPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topItems, setTopItems] = useState<Item[]>([]);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [last24h, setLast24h] = useState<Item[]>([]);
  const [videos, setVideos] = useState<Item[]>([]);
  const [guides, setGuides] = useState<KnowledgeGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ topics: 0, items: 0, sources: 0 });

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      api.getTopics(),
      api.getItems({ sort: "top", limit: "5" }),
      api.getItems({ sort: "recent", limit: "8" }),
      api.getItems({ sort: "recent", limit: "6", since }),
      api.getItems({ type: "video", sort: "recent", limit: "4" }),
      api.getKnowledgeGuides(),
      api.getSources(),
    ]).then(([topicsData, topData, recentData, last24Data, videoData, guidesData, sourcesData]) => {
      setTopics(topicsData.filter((t) => t.item_count > 0).slice(0, 8));
      setTopItems(topData.items);
      setRecentItems(recentData.items);
      setLast24h(last24Data.items);
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-12">
      {/* Editorial header */}
      <header className="pb-6 border-b border-line">
        <div className="eyebrow mb-3">{today}</div>
        <h1 className="display text-[36px] sm:text-[44px] text-ink mb-3 max-w-2xl">
          What's actually moving<br />
          <span className="italic text-ink-soft">in AI today.</span>
        </h1>
        <p className="text-[15px] text-ink-muted max-w-xl leading-relaxed">
          Papers, repos, releases and reading — pulled from arXiv, GitHub,
          Hugging Face, Hacker News and a few good newsrooms. No newsletters, no noise.
        </p>
        <div className="flex items-center gap-6 mt-6 text-[13px]">
          <Stat label="Topics tracked" value={stats.topics} />
          <span className="w-px h-6 bg-line" />
          <Stat label="Items indexed" value={stats.items} />
          <span className="w-px h-6 bg-line" />
          <Stat label="Sources" value={stats.sources} />
        </div>
      </header>

      {/* Quick links — restrained, monochrome */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickLink to="/devhub" icon="wrench" label="Dev Hub" hint="Tools & SDKs" />
          <QuickLink to="/videos" icon="play" label="Videos" hint="Talks & demos" />
          <QuickLink to="/knowledge" icon="book" label="Knowledge" hint="Long reads" />
          <QuickLink to="/feed" icon="rss" label="Full feed" hint="Everything, fresh" />
        </div>
      </section>

      {/* Last 24 hours */}
      {last24h.length > 0 && (
        <Section eyebrow="Last 24 hours" title="Just dropped" link="/feed?sort=recent" icon="rss">
          <div className="space-y-2.5">
            {last24h.map((item) => (
              <FeedItem key={item.id} item={item} showTopic />
            ))}
          </div>
        </Section>
      )}

      {/* Trending */}
      {topItems.length > 0 && (
        <Section eyebrow="On the rise" title="Trending this week" link="/feed?sort=top" icon="trending">
          <div className="space-y-2.5">
            {topItems.map((item) => (
              <FeedItem key={item.id} item={item} showTopic />
            ))}
          </div>
        </Section>
      )}

      {/* Latest videos */}
      {videos.length > 0 && (
        <Section eyebrow="Watch" title="Fresh videos" link="/videos" icon="play">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {videos.map((v) => (
              <VideoCard key={v.id} item={v} />
            ))}
          </div>
        </Section>
      )}

      {/* Hot topics */}
      <Section eyebrow="Browse" title="Active topics" link="/topics" icon="layers">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {topics.map((t) => (
            <Link
              key={t.id}
              to={`/topic/${t.slug}`}
              className="bg-surface rounded-lg border border-line p-3.5 hover:border-ink/40 hover:shadow-card transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.category_color }} />
                <span className="font-medium text-[13px] text-ink truncate">{t.name}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-faint">
                <span>{t.item_count} items</span>
                {t.latest_item_at && <span>{timeAgo(t.latest_item_at)}</span>}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Knowledge guides */}
      {guides.length > 0 && (
        <Section eyebrow="Read" title="Knowledge guides" link="/knowledge" icon="book">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {guides.map((g) => (
              <Link
                key={g.id}
                to={`/knowledge/${g.slug}`}
                className="flex items-start gap-3 bg-surface rounded-lg border border-line p-4 hover:border-ink/40 hover:shadow-card transition-all"
              >
                <span className="text-[20px] leading-none mt-0.5">{g.icon}</span>
                <div className="min-w-0">
                  <h3 className="font-medium text-[14px] text-ink leading-snug">{g.title}</h3>
                  <p className="text-[11px] text-ink-faint mt-1 uppercase tracking-wider">
                    {g.difficulty} · {g.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Recent */}
      <Section eyebrow="Just in" title="Recently added" link="/feed?sort=recent" icon="clock">
        <div className="space-y-2.5">
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
      <div className="font-medium text-ink text-[15px]">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wider text-ink-faint mt-0.5">{label}</div>
    </div>
  );
}

function QuickLink({
  to, icon, label, hint,
}: { to: string; icon: React.ComponentProps<typeof Icon>["name"]; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border border-line hover:border-ink/40 hover:shadow-card transition-all"
    >
      <span className="w-8 h-8 rounded-md bg-paper border border-line flex items-center justify-center text-ink-soft group-hover:text-ink group-hover:border-ink/30 transition-colors">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-ink leading-tight">{label}</div>
        <div className="text-[11px] text-ink-faint mt-0.5 truncate">{hint}</div>
      </div>
    </Link>
  );
}

function Section({
  eyebrow, title, link, icon, children,
}: {
  eyebrow: string;
  title: string;
  link: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4 pb-3 border-b border-line">
        <div>
          <div className="eyebrow mb-1 flex items-center gap-1.5">
            {icon && <Icon name={icon} size={11} />}
            {eyebrow}
          </div>
          <h2 className="display text-[22px] text-ink">{title}</h2>
        </div>
        <Link to={link} className="text-[12px] text-ink-muted hover:text-ink inline-flex items-center gap-1 group">
          View all
          <Icon name="arrow-right" size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      <div className="pb-6 border-b border-line">
        <div className="h-3 w-32 bg-line rounded mb-4" />
        <div className="h-12 w-3/4 bg-line/70 rounded mb-3" />
        <div className="h-12 w-1/2 bg-line/70 rounded mb-5" />
        <div className="h-4 w-full max-w-md bg-line/60 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-surface border border-line rounded-lg" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface border border-line rounded-lg" />
        ))}
      </div>
    </div>
  );
}

