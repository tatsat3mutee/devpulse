import { describe, expect, test } from "bun:test";
import { emptyState, kept, matchesPrefs, mergeEntries, mergePrefs, parseExport, toMarkdown, type Entry } from "../src/lib/library";

const entry = (overrides: Partial<Entry> = {}): Entry => ({ storyId: "hn-1", url: "https://example.com/a", headline: "A story", date: "2026-09-26", topic: "agents", saved: true, note: "", updatedAt: 10, ...overrides });

describe("library", () => {
  test("the newest edit wins per story and reports what changed", () => {
    const state = emptyState();
    expect(mergeEntries(state, [entry({ note: "first", updatedAt: 10 })])).toEqual(["hn-1"]);
    expect(mergeEntries(state, [entry({ note: "stale", updatedAt: 5 })])).toEqual([]);
    expect(mergeEntries(state, [entry({ note: "newer", updatedAt: 20 }), entry({ storyId: "hn-2", updatedAt: 1 })])).toEqual(["hn-1", "hn-2"]);
    expect(state.entries["hn-1"].note).toBe("newer");
    expect(mergePrefs(state, { follow: ["agents"], muted: [], updatedAt: 5 })).toBe(true);
    expect(mergePrefs(state, { follow: [], muted: [], updatedAt: 4 })).toBe(false);
    expect(state.prefs.follow).toEqual(["agents"]);
  });

  test("the library keeps saved stories and noted ones, newest first", () => {
    const state = emptyState();
    mergeEntries(state, [entry({ storyId: "a", saved: false, note: "", updatedAt: 3 }), entry({ storyId: "b", saved: false, note: "keep", updatedAt: 1 }), entry({ storyId: "c", saved: true, updatedAt: 2 })]);
    expect(kept(state).map((item) => item.storyId)).toEqual(["c", "b"]);
  });

  test("Markdown export links each story and quotes its note", () => {
    expect(toMarkdown([entry({ headline: "Agents [draft]", note: "try this\nat work" })])).toBe("# DevPulse library\n\n- [Agents draft](https://example.com/a) — 2026-09-26 · saved\n  > try this\n  > at work\n");
  });

  test("imports keep only well-formed entries", () => {
    const file = JSON.stringify({ entries: [entry(), entry({ storyId: "../x" }), entry({ storyId: "b", url: "javascript:alert(1)" }), { junk: true }], prefs: { follow: ["agents", 3], muted: ["example.com"], updatedAt: 9 } });
    const parsed = parseExport(file);
    expect(parsed.entries.map((item) => item.storyId)).toEqual(["hn-1"]);
    expect(parsed.prefs).toEqual({ follow: ["agents"], muted: ["example.com"], updatedAt: 9 });
    expect(() => parseExport("not json")).toThrow();
  });

  test("For you keeps followed topics and drops muted sites, including subdomains", () => {
    const prefs = { follow: ["agents"], muted: ["example.com"] };
    expect(matchesPrefs(prefs, "agents", "blog.other.dev")).toBe(true);
    expect(matchesPrefs(prefs, "web", "blog.other.dev")).toBe(false);
    expect(matchesPrefs(prefs, "agents", "news.example.com")).toBe(false);
    expect(matchesPrefs({ follow: [], muted: [] }, "web", "a.dev")).toBe(true);
  });
});
