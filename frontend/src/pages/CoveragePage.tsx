import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  AREA_LABELS,
  type BenchmarkMovementResponse,
  type CoverageResponse,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

/**
 * Coverage — the five tracked areas against your ledger.
 *
 * Deliberately a checklist, not a knowledge graph. A novel interaction model
 * has to clear a much higher value bar than a familiar one, and a coverage list
 * answers the actual question ("what's still pending for me in open weights?")
 * at a fraction of the learning cost a node-and-edge diagram would impose.
 */
export default function CoveragePage() {
  const { user } = useAuth();
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .getCoverage()
      .then((res) => !cancelled && setData(res))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg py-8">
        <h1 className="display text-[26px] text-ink mb-3">Coverage</h1>
        <p className="text-[15px] text-ink-muted mb-6">
          Sign in to see which parts of the frontier you've covered.
        </p>
        <Link to="/login" className="text-[13px] font-medium text-accent hover:underline">
          Sign in →
        </Link>
      </div>
    );
  }

  if (loading) return <CoverageSkeleton />;
  if (error) {
    return <p className="text-[14px] text-ink-muted py-8">Couldn't load coverage: {error}</p>;
  }

  const areas = data?.areas ?? [];
  const totals = areas.reduce(
    (acc, a) => ({
      total: acc.total + a.total,
      mastered: acc.mastered + a.mastered,
    }),
    { total: 0, mastered: 0 }
  );

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="display text-[30px] text-ink mb-2">Coverage</h1>
        <p className="text-[15px] text-ink-muted">
          {totals.mastered} of {totals.total} concepts marked understood across five areas.
        </p>
      </header>

      <section className="space-y-3 mb-12">
        {areas.length === 0 && (
          <p className="text-[14px] text-ink-muted">
            No concepts published yet. Run the seed script to populate the corpus.
          </p>
        )}
        {areas.map((a) => {
          const pct = a.total ? Math.round((a.mastered / a.total) * 100) : 0;
          return (
            <Link
              key={a.area}
              to={`/archive?area=${encodeURIComponent(a.area)}`}
              className="group block border border-line rounded-xl p-4 bg-surface hover:border-ink/20 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="text-[15px] font-medium text-ink group-hover:text-accent transition-colors">
                  {AREA_LABELS[a.area] ?? a.area}
                </h2>
                <span className="font-mono text-[12px] text-ink-faint shrink-0">
                  {a.mastered}/{a.total}
                </span>
              </div>

              {/* mastered / seen-but-not-mastered / unexplored */}
              <div className="flex h-1.5 rounded-full overflow-hidden bg-line">
                <div className="bg-accent" style={{ width: `${pct}%` }} />
                <div
                  className="bg-accent/30"
                  style={{ width: `${a.total ? (a.seen / a.total) * 100 : 0}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[11.5px] text-ink-faint">
                <span>{a.mastered} understood</span>
                <span>{a.seen} seen</span>
                <span>{a.unexplored} unexplored</span>
              </div>
            </Link>
          );
        })}
      </section>

      {data?.recent.length ? (
        <section>
          <p className="eyebrow text-ink-faint mb-4">Recently served</p>
          <ul className="divide-y divide-line border-y border-line">
            {data.recent.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/concept/${r.slug}`}
                  className="group flex items-center gap-3 py-2.5 hover:bg-surface transition-colors -mx-3 px-3"
                >
                  <StateDot state={r.state} />
                  <span className="flex-1 min-w-0 text-[13.5px] text-ink-soft group-hover:text-ink truncate">
                    {r.title}
                  </span>
                  <span className="text-[11px] text-ink-faint font-mono shrink-0 hidden sm:inline">
                    {r.served_on}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MovementPanel />
    </div>
  );
}

/**
 * Benchmark movement.
 *
 * The plan cut the model-release feed — release news has no informational edge
 * when a dozen newsletters cover each launch within hours. What survives is
 * *movement*: who gained on the intelligence index, what got cheaper. That only
 * exists because a nightly job now writes snapshots; before, the leaderboard
 * was a 6h in-process cache lost on every deploy.
 */
function MovementPanel() {
  const [data, setData] = useState<BenchmarkMovementResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getBenchmarkMovement(30)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) return null;

  // Distinguish "no history yet" from "nothing moved" — they mean different
  // things and a bare empty state would imply the latter.
  if (!data.has_history) {
    return (
      <section className="mt-12">
        <p className="eyebrow text-ink-faint mb-3">Model movement</p>
        <p className="text-[13.5px] text-ink-muted">
          Tracking started — {data.snapshot_days === 1 ? "one snapshot" : `${data.snapshot_days} snapshots`} so
          far. Movement appears once there are at least two days to compare.
        </p>
      </section>
    );
  }

  const moved = data.movement
    .filter((m) => m.intelligence_delta !== null && Math.abs(m.intelligence_delta) >= 0.1)
    .slice(0, 8);

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="eyebrow text-ink-faint">Model movement</p>
        <span className="text-[11px] text-ink-faint font-mono">
          {data.movement[0]?.since} → {data.movement[0]?.as_of}
        </span>
      </div>

      {moved.length === 0 ? (
        <p className="text-[13.5px] text-ink-muted">
          No index moved by more than 0.1 in the last 30 days.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {moved.map((m) => {
            const delta = m.intelligence_delta ?? 0;
            const up = delta > 0;
            return (
              <li key={m.model_slug} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 min-w-0 text-[13.5px] text-ink-soft truncate">
                  {m.model_name}
                  <span className="text-ink-faint ml-1.5 text-[12px]">{m.creator}</span>
                </span>
                <span className="font-mono text-[12px] text-ink-faint shrink-0">
                  {m.intelligence_now?.toFixed(1)}
                </span>
                <span
                  className={`font-mono text-[12px] shrink-0 w-14 text-right ${
                    up ? "text-accent" : "text-ink-muted"
                  }`}
                >
                  {up ? "+" : ""}
                  {delta.toFixed(1)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-ink-faint">
        Intelligence index ·{" "}
        <a
          href="https://artificialanalysis.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink-muted underline"
        >
          data by Artificial Analysis
        </a>
      </p>
    </section>
  );
}


function StateDot({ state }: { state: string }) {
  if (state === "got_it") {
    return <Icon name="check" size={13} className="text-accent shrink-0" />;
  }
  const color = state === "not_for_me" ? "bg-ink-faint/40" : "bg-accent/40";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function CoverageSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse space-y-3">
      <div className="h-8 w-40 bg-surface rounded mb-6" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-surface border border-line rounded-xl" />
      ))}
    </div>
  );
}
