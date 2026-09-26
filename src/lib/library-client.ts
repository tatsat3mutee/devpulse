// Browser runtime for the library: localStorage persistence, change events and optional sync with the account API.
import { emptyState, kept, mergeEntries, mergePrefs, parseExport, toMarkdown, type Entry, type LibraryState, type Prefs } from "./library";

export const STORAGE_KEY = "devpulse-library-v1";
export const API_URL = (import.meta.env.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, "") || "";
export type Account = { id: number; name: string | null; email: string | null; avatarUrl: string | null };

let state: LibraryState = load();

function load(): LibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) } as LibraryState;
  } catch {}
  return emptyState();
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  window.dispatchEvent(new CustomEvent("devpulse:library"));
}
// Another tab changed the library.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) { state = load(); window.dispatchEvent(new CustomEvent("devpulse:library")); }
});

export const entry = (storyId: string): Entry | undefined => state.entries[storyId];
export const library = () => kept(state);
export const prefs = (): Prefs => state.prefs;
export const syncedAt = () => state.lastSync;

export type StoryMeta = Pick<Entry, "storyId" | "url" | "headline" | "date" | "topic">;
export function update(meta: StoryMeta, patch: Partial<Pick<Entry, "saved" | "note">>) {
  const current = state.entries[meta.storyId];
  const base = current ?? { saved: false, note: "" };
  state.entries[meta.storyId] = { ...base, ...meta, ...patch, updatedAt: Math.max(Date.now(), (current?.updatedAt ?? 0) + 1) };
  if (!state.dirty.includes(meta.storyId)) state.dirty.push(meta.storyId);
  persist();
  scheduleSync();
}
export function updatePrefs(patch: Partial<Pick<Prefs, "follow" | "muted">>) {
  state.prefs = { ...state.prefs, ...patch, updatedAt: Math.max(Date.now(), state.prefs.updatedAt + 1) };
  state.prefsDirty = true;
  persist();
  scheduleSync();
}

export const exportJson = () => JSON.stringify({ app: "devpulse", exportedAt: new Date().toISOString(), entries: kept(state), prefs: state.prefs }, null, 2);
export const exportMarkdown = () => toMarkdown(kept(state));
export function importJson(text: string): number {
  const data = parseExport(text);
  const changed = mergeEntries(state, data.entries);
  for (const id of changed) if (!state.dirty.includes(id)) state.dirty.push(id);
  if (mergePrefs(state, data.prefs)) state.prefsDirty = true;
  persist();
  scheduleSync();
  return changed.length;
}

// ── Account and sync ─────────────────────────────────────────────
let account: Promise<Account | null> | undefined;
export function currentAccount(refresh = false): Promise<Account | null> {
  if (!API_URL) return Promise.resolve(null);
  if (!account || refresh) {
    account = fetch(`${API_URL}/me`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : { user: null })
      .then((body: { user: Account | null }) => body.user)
      .catch(() => null);
  }
  return account;
}
export const signInUrl = (provider: "google" | "github", returnTo = location.pathname) => `${API_URL}/auth/${provider}/start?return=${encodeURIComponent(returnTo)}`;

let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | undefined;
export function scheduleSync(delay = 1500) {
  if (!API_URL) return;
  clearTimeout(timer);
  timer = setTimeout(() => { void sync(); }, delay);
}

export async function sync(): Promise<"synced" | "signed-out" | "offline" | "error"> {
  if (!API_URL) return "signed-out";
  if (running) { await running; }
  let result: "synced" | "signed-out" | "offline" | "error" = "synced";
  running = (async () => {
    if (!(await currentAccount())) { result = "signed-out"; return; }
    const sent = state.dirty.map((id) => state.entries[id]).filter(Boolean);
    const sentPrefs = state.prefsDirty ? state.prefs : undefined;
    let response: Response;
    try {
      response = await fetch(`${API_URL}/sync`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ since: state.lastSync, entries: sent, prefs: sentPrefs }) });
    } catch { result = "offline"; return; }
    if (response.status === 401) { account = Promise.resolve(null); result = "signed-out"; return; }
    if (!response.ok) { result = "error"; return; }
    const reply = await response.json() as { serverTime: number; entries: Entry[]; prefs?: Prefs };
    // Anything edited again while the request was in flight stays dirty for the next round.
    state.dirty = state.dirty.filter((id) => !sent.some((entry) => entry.storyId === id && entry.updatedAt === state.entries[id]?.updatedAt));
    if (sentPrefs && sentPrefs.updatedAt === state.prefs.updatedAt) state.prefsDirty = false;
    mergeEntries(state, reply.entries);
    mergePrefs(state, reply.prefs);
    state.lastSync = reply.serverTime;
    persist();
  })();
  await running;
  running = undefined;
  return result;
}

export async function signOut() {
  if (API_URL) await fetch(`${API_URL}/logout`, { method: "POST", credentials: "include" }).catch(() => null);
  account = Promise.resolve(null);
  state.lastSync = 0;
  persist();
}
export async function deleteAccount() {
  if (!API_URL) return false;
  const response = await fetch(`${API_URL}/me`, { method: "DELETE", credentials: "include" }).catch(() => null);
  if (!response?.ok) return false;
  account = Promise.resolve(null);
  state.lastSync = 0;
  persist();
  return true;
}
