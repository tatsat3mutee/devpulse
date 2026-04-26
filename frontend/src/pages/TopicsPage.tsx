import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Topic } from "../lib/api";
import { timeAgo } from "../lib/utils";

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTopics().then(setTopics).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  const withItems = topics.filter((t) => t.item_count > 0);
  const empty = topics.filter((t) => t.item_count === 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Topics</h1>
      <p className="text-gray-500 mb-6 text-sm">
        {topics.length} topics · {withItems.reduce((s, t) => s + t.item_count, 0)} items tracked
      </p>

      {/* Active topics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {withItems.map((t) => (
          <Link
            key={t.id}
            to={`/topic/${t.slug}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: t.category_color }}
              />
              <span className="font-semibold text-sm truncate">{t.name}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {t.item_count}
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
              {t.description}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="px-1.5 py-0.5 rounded bg-gray-50">{t.category}</span>
              {t.latest_item_at && <span>{timeAgo(t.latest_item_at)}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty topics (collapsed) */}
      {empty.length > 0 && (
        <details className="text-sm text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">
            {empty.length} topics with no items yet
          </summary>
          <div className="flex flex-wrap gap-2 mt-2">
            {empty.map((t) => (
              <span key={t.id} className="px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs">
                {t.name}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-48 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
