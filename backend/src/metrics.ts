// In-memory operational metrics (per process). Exposed via GET /api/metrics (admin).
// Counters survive until restart — good enough for a single-instance deployment.

const counters = new Map<string, number>();
const gauges = new Map<string, number | string>();
const startedAt = Date.now();

/** Increment a counter, e.g. inc("fetch.items_inserted", 12) or inc("llm.calls.groq"). */
export function inc(name: string, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

/** Set a gauge value, e.g. gauge("fetch.last_run_at", Date.now()). */
export function gauge(name: string, value: number | string): void {
  gauges.set(name, value);
}

export interface MetricsSnapshot {
  uptime_seconds: number;
  counters: Record<string, number>;
  gauges: Record<string, number | string>;
}

export function snapshot(): MetricsSnapshot {
  return {
    uptime_seconds: Math.round((Date.now() - startedAt) / 1000),
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
  };
}

/** Test helper — clears all metrics. */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
}
