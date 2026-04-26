import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, Item, TopicDetail } from "../lib/api";
import FeedItem from "../components/FeedItem";

export default function TopicDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<TopicDetail | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("top");
  const [loading, setLoading] = useState(true);

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
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalCount = (data.type_counts || []).reduce((sum, tc) => sum + tc.count, 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link to="/" className="hover:text-gray-700 transition-colors">Topics</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{data.name}</span>
      </div>

      {/* Topic header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <span
            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: data.category_color }}
          />
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
            {data.category}
          </span>
        </div>
        <p className="text-gray-400 text-sm ml-6">{data.description}</p>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setTypeFilter("")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            !typeFilter
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All {totalCount}
        </button>
        {(data.type_counts || []).map((tc) => (
          <button
            key={tc.type}
            onClick={() => setTypeFilter(tc.type)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${
              typeFilter === tc.type
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tc.type.charAt(0).toUpperCase() + tc.type.slice(1)} ({tc.count})
          </button>
        ))}

        {/* Sort */}
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setSort("top")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              sort === "top" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSort("recent")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              sort === "recent" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Recent
          </button>
        </div>
      </div>

      {/* Items list */}
      {data.items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No items yet</p>
          <p className="text-sm">Items will appear after the next fetch cycle</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
            <FeedItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
