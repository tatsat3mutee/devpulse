import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../lib/api";

interface DailyRow {
  topic_id: number;
  topic_name: string;
  topic_slug: string;
  day: string;
  count: number;
}

const PALETTE = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#3b82f6", "#a3e635",
];

function formatDay(day: string) {
  const d = new Date(day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TrendingPage() {
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getTrendingDaily()
      .then((data) => {
        setRows(data);
        // Auto-select top 5 topics by total count
        const totals: Record<string, number> = {};
        for (const r of data) {
          totals[r.topic_slug] = (totals[r.topic_slug] || 0) + r.count;
        }
        const top5 = Object.entries(totals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([slug]) => slug);
        setSelectedTopics(new Set(top5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Unique sorted days
  const days = useMemo(() => {
    const set = new Set(rows.map((r) => r.day));
    return Array.from(set).sort();
  }, [rows]);

  // Unique topics with totals, sorted by total desc
  const topics = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; total: number }>();
    for (const r of rows) {
      const existing = map.get(r.topic_slug);
      if (existing) {
        existing.total += r.count;
      } else {
        map.set(r.topic_slug, { name: r.topic_name, slug: r.topic_slug, total: r.count });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  // Build chart data: [{ day: "Jun 1", "llm-tools": 5, ... }]
  const chartData = useMemo(() => {
    const idx: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      if (!idx[r.day]) idx[r.day] = {};
      idx[r.day][r.topic_slug] = r.count;
    }
    return days.map((day) => ({
      day: formatDay(day),
      ...idx[day],
    }));
  }, [rows, days]);

  const visibleTopics = topics.filter((t) => selectedTopics.has(t.slug));

  function toggleTopic(slug: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink mb-1">Topic Trends</h1>
        <p className="text-[13.5px] text-ink-muted">
          Daily item volume per topic over the last 14 days.
        </p>
      </div>

      {loading ? (
        <div className="h-64 bg-surface rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="text-ink-muted text-[14px] py-12 text-center">
          No trending data yet - check back after some items have been fetched.
        </div>
      ) : (
        <>
          {/* Topic filter pills */}
          <div className="flex flex-wrap gap-2">
            {topics.map((t, i) => {
              const color = PALETTE[i % PALETTE.length];
              const active = selectedTopics.has(t.slug);
              return (
                <button
                  key={t.slug}
                  onClick={() => toggleTopic(t.slug)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium border transition-all ${
                    active
                      ? "border-transparent text-paper"
                      : "border-line text-ink-muted bg-surface hover:border-ink/20"
                  }`}
                  style={active ? { backgroundColor: color, borderColor: color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: active ? "#fff" : color }}
                  />
                  {t.name}
                  <span className={`opacity-60 text-[10px]`}>{t.total}</span>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div className="bg-surface border border-line rounded-xl p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line, #e2e8f0)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--color-ink-muted, #94a3b8)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-ink-muted, #94a3b8)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface, #1e293b)",
                    border: "1px solid var(--color-line, #334155)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--color-ink, #f1f5f9)", marginBottom: 4 }}
                  itemStyle={{ color: "var(--color-ink-soft, #cbd5e1)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(value) => topics.find((t) => t.slug === value)?.name ?? value}
                />
                {visibleTopics.map((t) => (
                  <Line
                    key={t.slug}
                    type="monotone"
                    dataKey={t.slug}
                    name={t.slug}
                    stroke={PALETTE[topics.indexOf(t) % PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top topics table */}
          <section>
            <p className="eyebrow mb-3">All topics (14-day total)</p>
            <div className="border border-line rounded-lg overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-surface">
                    <th className="text-left px-4 py-2.5 text-ink-muted font-medium">Topic</th>
                    <th className="text-right px-4 py-2.5 text-ink-muted font-medium">Items (14d)</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.slice(0, 20).map((t, i) => (
                    <tr key={t.slug} className="border-b border-line/60 last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                          <Link
                            to={`/topic/${t.slug}`}
                            className="text-ink hover:text-accent transition-colors"
                          >
                            {t.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-ink-muted font-mono">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
