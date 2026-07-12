import { beforeEach, describe, expect, test } from "bun:test";
import { gauge, inc, resetMetrics, snapshot } from "./metrics.js";

describe("metrics", () => {
  beforeEach(() => resetMetrics());

  test("counters increment and accumulate", () => {
    inc("fetch.runs");
    inc("fetch.runs");
    inc("fetch.items_inserted", 25);
    const snap = snapshot();
    expect(snap.counters["fetch.runs"]).toBe(2);
    expect(snap.counters["fetch.items_inserted"]).toBe(25);
  });

  test("gauges overwrite", () => {
    gauge("fetch.last_inserted", 5);
    gauge("fetch.last_inserted", 9);
    expect(snapshot().gauges["fetch.last_inserted"]).toBe(9);
  });

  test("snapshot reports uptime and empty state safely", () => {
    const snap = snapshot();
    expect(snap.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(snap.counters).toEqual({});
  });
});
