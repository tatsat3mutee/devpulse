import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, TopicDetail } from "../lib/api";
import FeedItem from "../components/FeedItem";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";

export default function TopicDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, followedTopicIds, followTopic, unfollowTopic } = useAuth();
  const [data, setData] = useState<TopicDetail | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("top");
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const params: Record<string, string> = { sort };
    if (typeFilter) params.type = typeFilter;
    api.getTopicDetail(slug, params).then(setData).finally(() => setLoading(false));
  }, [slug, typeFilter, sort]);

  if (loading || !data) {
    return (
      <div className="animate-pulse">
        <div className="h-3 w-24 bg-line rounded mb-4" />
        <div className="h-10 w-2/3 bg-line/70 rounded mb-3" />
        <div className="h-4 w-1/2 bg-line/60 rounded mb-8" />
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface border border-line rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalCount = (data.type_counts || []).reduce((sum, tc) => sum + tc.count, 0);
  const isFollowed = followedTopicIds.has(data.id);

  const handleFollowToggle = async () => {
    if (!user) return;
    setFollowLoading(true);
    try {
      if (isFollowed) {
        await unfollowTopic(data.id);
      } else {
        await followTopic(data.id);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/topics"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink mb-4 transition-colors"
      >
        <Icon name="arrow-left" size={12} />
        All topics
      </Link>

      {/* Header */}
      <header className="mb-8 pb-5 border-b border-line">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="eyebrow mb-2 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: data.category_color }}
              />
              {data.category}
            </div>
            <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">
              {data.name}
            </h1>
            {data.description && (
              <p className="text-ink-muted text-[14px] max-w-2xl leading-relaxed">
                {data.description}
              </p>
            )}
          </div>
          {user && (
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`shrink-0 mt-2 px-4 py-2 text-[13px] font-medium rounded-lg border transition-all ${
                isFollowed
                  ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
                  : "border-line text-ink-muted hover:border-ink/30 hover:text-ink bg-surface"
              } disabled:opacity-50`}
            >
              {isFollowed ? "Following ✓" : "Follow"}
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setTypeFilter("")}
          className={`px-2.5 py-1 text-[11.5px] uppercase tracking-wider font-medium rounded transition-colors ${
            !typeFilter
              ? "bg-ink text-paper"
              : "text-ink-muted hover:text-ink border border-line bg-surface"
          }`}
        >
          All <span className="ml-1 font-mono opacity-70">{totalCount}</span>
        </button>
        {(data.type_counts || []).map((tc) => (
          <button
            key={tc.type}
            onClick={() => setTypeFilter(tc.type)}
            className={`px-2.5 py-1 text-[11.5px] uppercase tracking-wider font-medium rounded transition-colors capitalize ${
              typeFilter === tc.type
                ? "bg-ink text-paper"
                : "text-ink-muted hover:text-ink border border-line bg-surface"
            }`}
          >
            {tc.type} <span className="ml-1 font-mono opacity-70">{tc.count}</span>
          </button>
        ))}

        <div className="ml-auto flex gap-px bg-paper border border-line rounded-md p-0.5">
          <button
            onClick={() => setSort("top")}
            className={`px-3 py-1 text-[11.5px] font-medium uppercase tracking-wider rounded transition-colors ${
              sort === "top" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSort("recent")}
            className={`px-3 py-1 text-[11.5px] font-medium uppercase tracking-wider rounded transition-colors ${
              sort === "recent" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
            }`}
          >
            New
          </button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="text-center py-20">
          <p className="display text-[28px] text-ink-soft mb-1">Quiet on this topic.</p>
          <p className="text-[13.5px] text-ink-muted">Items will appear after the next fetch cycle.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.items.map((item) => (
            <FeedItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

