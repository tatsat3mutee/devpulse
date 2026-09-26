// The reader's library: saved stories, private notes and topic preferences.
// Pure logic here (merging, export, import) so it is testable; storage and sync live in library-client.ts.

export type Entry = { storyId: string; url: string; headline: string; date: string; topic: string; saved: boolean; note: string; updatedAt: number };
export type Prefs = { follow: string[]; muted: string[]; updatedAt: number };
export type LibraryState = { version: 1; entries: Record<string, Entry>; prefs: Prefs; dirty: string[]; prefsDirty: boolean; lastSync: number };

export const emptyState = (): LibraryState => ({ version: 1, entries: {}, prefs: { follow: [], muted: [], updatedAt: 0 }, dirty: [], prefsDirty: false, lastSync: 0 });

/** Last write wins, per story. Returns the ids whose local copy changed. */
export function mergeEntries(state: LibraryState, incoming: Entry[]): string[] {
  const changed: string[] = [];
  for (const entry of incoming) {
    const local = state.entries[entry.storyId];
    if (!local || local.updatedAt < entry.updatedAt) {
      state.entries[entry.storyId] = entry;
      changed.push(entry.storyId);
    }
  }
  return changed;
}

export function mergePrefs(state: LibraryState, incoming?: Prefs): boolean {
  if (!incoming || incoming.updatedAt <= state.prefs.updatedAt) return false;
  state.prefs = { follow: [...incoming.follow], muted: [...incoming.muted], updatedAt: incoming.updatedAt };
  return true;
}

/** Entries worth keeping: saved, or carrying a note. */
export const kept = (state: LibraryState) => Object.values(state.entries).filter((entry) => entry.saved || entry.note.trim()).sort((a, b) => b.updatedAt - a.updatedAt);

export function toMarkdown(entries: Entry[], title = "DevPulse library"): string {
  const lines = [`# ${title}`, ""];
  for (const entry of entries) {
    lines.push(`- [${entry.headline.replace(/[[\]]/g, "")}](${entry.url}) — ${entry.date}${entry.saved ? " · saved" : ""}`);
    for (const line of entry.note.trim().split("\n").filter(Boolean)) lines.push(`  > ${line}`);
  }
  return `${lines.join("\n")}\n`;
}

const isEntry = (value: unknown): value is Entry => {
  const entry = value as Entry;
  return Boolean(entry) && typeof entry.storyId === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/.test(entry.storyId)
    && typeof entry.url === "string" && /^https?:\/\//.test(entry.url) && typeof entry.headline === "string"
    && typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && typeof entry.topic === "string"
    && typeof entry.saved === "boolean" && typeof entry.note === "string" && entry.note.length <= 5000 && Number.isFinite(entry.updatedAt);
};

/** Reads an exported library file, keeping only well-formed entries. */
export function parseExport(text: string): { entries: Entry[]; prefs?: Prefs } {
  const data = JSON.parse(text) as { entries?: unknown; prefs?: Prefs };
  const raw = Array.isArray(data.entries) ? data.entries : Object.values((data.entries ?? {}) as Record<string, unknown>);
  const prefs = data.prefs && Array.isArray(data.prefs.follow) && Array.isArray(data.prefs.muted)
    ? { follow: data.prefs.follow.filter((value) => typeof value === "string").slice(0, 20), muted: data.prefs.muted.filter((value) => typeof value === "string").slice(0, 100), updatedAt: Number(data.prefs.updatedAt) || Date.now() }
    : undefined;
  return { entries: raw.filter(isEntry).slice(0, 5000), prefs };
}

/** Whether a story belongs in the reader's "For you" view. */
export const matchesPrefs = (prefs: Pick<Prefs, "follow" | "muted">, topic: string, domain: string) =>
  (prefs.follow.length === 0 || prefs.follow.includes(topic)) && !prefs.muted.some((muted) => domain === muted || domain.endsWith(`.${muted}`));
