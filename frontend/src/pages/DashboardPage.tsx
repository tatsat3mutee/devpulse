import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { api, Item, Topic, KnowledgeGuide } from "../lib/api";
import FeedItem from "../components/FeedItem";
import ClusteredFeed from "../components/ClusteredFeed";
import VideoCard from "../components/VideoCard";
import Icon from "../components/Icon";
import { timeAgo } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

const AUTO_REFRESH_MS = 15 * 60 * 1000;

interface DailyRow {
  topic_id: number;
  topic_name: string;
  topic_slug: string;
  day: string;
  count: number;
}

const TREND_PALETTE = ["#10b981","#6366f1","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];

export default function DashboardPage() {
  const { user, followedTopicIds } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topItems, setTopItems] = useState<Item[]>([]);
  const [last24h, setLast24h] = useState<Item[]>([]);
  const [videos, setVideos] = useState<Item[]>([]);
  const [trendRows, setTrendRows] = useState<DailyRow[]>([]);
  const [guides, setGuides] = useState<KnowledgeGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ topics: 0, items: 0, sources: 0 });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [followedTopics, setFollowedTopics] = useState<{ id: number; name: string; slug: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPersonalized = user != null && followedTopicIds.size > 0;

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const topParams: Record<string, string> = { sort: "top", limit: "5" };
    if (isPersonalized) {
      topParams.personalized = "true";
    }
    try {
      const [topicsData, topData, last24Data, videoData, sourcesData, trendData, guidesData] = await Promise.all([
        api.getTopics(),
        api.getItems(topParams),
        api.getItems({ sort: "recent", limit: "6", since }),
        api.getItems({ type: "video", sort: "top", limit: "12" }),
        api.getSources(),
        api.getTrendingDaily().catch(() => [] as DailyRow[]),
        api.getKnowledgeGuides().catch(() => [] as KnowledgeGuide[]),
      ]);
      setTopics(topicsData.filter((t) => t.item_count > 0).slice(0, 8));
      setTopItems(topData.items);
      setLast24h(last24Data.items);
      setVideos(videoData.items);
      setTrendRows(trendData as DailyRow[]);
      setGuides((guidesData as KnowledgeGuide[]).slice(0, 4));
      setStats({
        topics: topicsData.length,
        items: topicsData.reduce((s, t) => s + t.item_count, 0),
        sources: sourcesData.length,
      });
      // Build followed topic chips from topics list
      if (followedTopicIds.size > 0) {
        const ft = topicsData.filter(t => followedTopicIds.has(t.id)).map(t => ({ id: t.id, name: t.name, slug: t.slug }));
        setFollowedTopics(ft);
      }
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, [isPersonalized, followedTopicIds]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 15 min
  useEffect(() => {
    timerRef.current = setInterval(() => { load(); }, AUTO_REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  // Compute top 7 topics by 14-day total for the mini bar chart
  const trendTopics = useMemo(() => {
    const totals = new Map<string, { name: string; count: number }>();
    for (const r of trendRows) {
      const cur = totals.get(r.topic_slug) || { name: r.topic_name, count: 0 };
      totals.set(r.topic_slug, { ...cur, count: cur.count + r.count });
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 7)
      .map(([slug, { name, count }]) => ({ slug, name, count }));
  }, [trendRows]);

  const maxTrend = trendTopics[0]?.count || 1;

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
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-10 items-start">
          {/* Left: masthead */}
          <div>
            <div className="eyebrow mb-3">{today}</div>
            <h1 className="display text-[36px] sm:text-[44px] text-ink mb-3">
              What's actually moving<br />
              <span className="italic text-ink-soft">in AI today.</span>
            </h1>
            <p className="text-[15px] text-ink-muted max-w-xl leading-relaxed">
              Papers, repos, releases and reading - pulled from arXiv, GitHub,
              Hugging Face, Hacker News and a few good newsrooms. No newsletters, no noise.
            </p>
            {isPersonalized && (
              <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                <span className="text-[11px] text-accent font-medium uppercase tracking-wider">Personalised</span>
                {followedTopics.map(t => (
                  <Link
                    key={t.id}
                    to={`/topic/${t.slug}`}
                    className="text-[11.5px] font-medium px-2.5 py-1 rounded-full border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 transition-colors"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}
            {user && !isPersonalized && (
              <p className="text-[12px] text-ink-faint mt-3">
                Follow topics on any topic page to get a personalised feed.
              </p>
            )}
            {!user && (
              <p className="text-[12px] text-ink-faint mt-3">
                <Link to="/login" className="text-accent hover:underline">Sign in</Link> to personalise your feed.
              </p>
            )}
          </div>

          {/* Right: snapshot panel — balances the hero on wide screens */}
          <div className="bg-surface border border-line rounded-xl p-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Topics tracked" value={stats.topics} />
              <Stat label="Items indexed" value={stats.items} />
              <Stat label="Sources" value={stats.sources} />
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-line text-[11px] text-ink-faint">
              <span>Updated {timeAgo(lastRefreshed.toISOString())}</span>
              <button
                onClick={() => load()}
                className="flex items-center gap-1 text-ink-faint hover:text-ink transition-colors"
                title="Refresh now"
              >
                <Icon name="refresh" size={11} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick links */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickLink to="/feed" icon="rss" label="Feed" hint="Everything, filtered" />
          <QuickLink to="/topics" icon="layers" label="Topics" hint="Browse by theme" />
          <QuickLink to="/videos" icon="play" label="Watch" hint="Talks & demos" />
          <QuickLink to="/chat" icon="chat" label="Chat" hint="Ask the AI" />
        </div>
      </section>

      {/* Active topics - surfaced near the top */}
      {topics.length > 0 && (
        <Section eyebrow="Browse" title="Active topics" link="/topics" icon="layers">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {topics.map((t) => (
              <Link
                key={t.id}
                to={`/topic/${t.slug}`}
                className="bg-surface rounded-xl border border-line p-3.5 hover:border-ink/20 hover:shadow-cardHover transition-all"
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
      )}

      {/* Last 24 hours */}
      {last24h.length > 0 && (
        <Section eyebrow="Last 24 hours" title="Just dropped" link="/feed?sort=recent" icon="rss">
          <ClusteredFeed items={last24h} showTopic />
        </Section>
      )}

      {/* Latest videos - horizontal carousel */}
      {videos.length > 0 && (
        <Section eyebrow="Watch" title="Trending videos" link="/videos" icon="play">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {videos.map((v) => (
              <div key={v.id} className="snap-start shrink-0 w-[240px] sm:w-[280px]">
                <VideoCard item={v} />
              </div>
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

      {/* Trend analysis mini chart */}
      {trendTopics.length > 0 && (
        <Section eyebrow="14-day signal" title="Topic momentum" link="/trending" icon="trending">
          <div className="bg-surface border border-line rounded-xl p-5 space-y-3">
            {trendTopics.map(({ slug, name, count }, i) => (
              <Link
                key={slug}
                to={`/topic/${slug}`}
                className="flex items-center gap-3 group"
              >
                <span className="text-[11px] text-ink-faint font-mono w-4 shrink-0">{i + 1}</span>
                <span className="text-[13px] text-ink-soft group-hover:text-ink transition-colors w-40 truncate shrink-0">
                  {name}
                </span>
                <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((count / maxTrend) * 100)}%`,
                      backgroundColor: TREND_PALETTE[i % TREND_PALETTE.length],
                    }}
                  />
                </div>
                <span className="text-[11px] text-ink-faint font-mono w-8 text-right shrink-0">{count}</span>
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint mt-3">Items indexed per topic in the last 14 days. <Link to="/trending" className="text-accent hover:underline">Full chart →</Link></p>
        </Section>
      )}

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
    <div className="space-y-10 animate-pulse">
      <div className="pb-6 border-b border-line">
        <div className="h-3 w-28 bg-surface rounded mb-4" />
        <div className="h-10 w-3/4 bg-surface rounded mb-3" />
        <div className="h-10 w-1/2 bg-surface rounded mb-5" />
        <div className="h-3.5 w-full max-w-md bg-surface rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-surface border border-line rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface border border-line rounded-xl" />
        ))}
      </div>
    </div>
  );
}

