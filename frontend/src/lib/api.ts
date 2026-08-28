const BASE = (import.meta.env.VITE_API_URL ?? "") + "/api";

function friendlyErrorMessage(status: number, path: string): string {
  if (status === 401) return "Please sign in to do that.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "Not found.";
  if (status === 429) return "You're going too fast — please wait a moment.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return `API ${status}: ${path}`;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) {
    // Prefer a server-provided { error } message when the body is JSON.
    let serverMsg: string | undefined;
    try {
      const body = await res.json();
      if (body && typeof body.error === "string" && body.error.trim()) {
        serverMsg = body.error;
      }
    } catch {
      // Non-JSON body — fall through to the friendly message.
    }
    throw new Error(serverMsg ?? friendlyErrorMessage(res.status, path));
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────

export interface Item {
  id: number;
  title: string;
  description: string | null;
  url: string;
  type: "paper" | "repo" | "social" | "news" | "video" | "article";
  platform: string;
  tags: string[];
  score: number;
  is_bookmarked: boolean;
  published_at: string;
  fetched_at: string;
  metadata: Record<string, any>;
  topic_name?: string;
  topic_slug?: string;
  source_id?: number | null;
  source_name?: string;
  image_url?: string;
  author?: string;
  duration?: string;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  category: string;
  category_color: string;
  description: string | null;
  item_count: number;
  latest_item_at: string | null;
}

export interface Source {
  id: number;
  name: string;
  platform: string;
  category: string;
  url: string;
  fetcher_key: string;
  is_active: boolean;
  last_fetched: string | null;
  rating: number;
  item_count: number;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
  limit: number;
  offset: number;
}

export interface TopicDetail extends Topic {
  items: Item[];
  type_counts: { type: string; count: number }[];
}

export interface FetchStats {
  sourcesProcessed: number;
  itemsFetched: number;
  itemsInserted: number;
  errors: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[]; // source URLs returned by Perplexity sonar
}

export interface ChatResponse {
  reply: string;
  provider: string;
  hasWebSearch: boolean;
  citations: string[];
}

// ── Prefs types ──────────────────────────────────────────────────────

export interface UserPrefs {
  followed_topics: { topic_id: number; name: string; slug: string }[];
  muted_sources: { source_id: number; name: string }[];
  role: string;
}

// ── Concepts ─────────────────────────────────────────────────────────

export const CONCEPT_AREAS = [
  "inference-serving",
  "open-weights",
  "agent-context",
  "evals-reliability",
  "credentials",
] as const;

export type ConceptArea = (typeof CONCEPT_AREAS)[number];

/** Display labels for the five tracked areas. */
export const AREA_LABELS: Record<string, string> = {
  "inference-serving": "Inference & serving",
  "open-weights": "Open weights",
  "agent-context": "Agents & context",
  "evals-reliability": "Evals & reliability",
  credentials: "Credentials",
};

export type ConceptState = "served" | "got_it" | "not_for_me" | "want_to_post";

export interface Concept {
  id: number;
  slug: string;
  title: string;
  hook: string;
  claim_number: string | null;
  mechanism: string;
  why_it_matters: string;
  transfer: string | null;
  post_draft: string | null;
  area: ConceptArea;
  difficulty: "working" | "deep" | "frontier";
  durability: number;
  state?: ConceptState | null;
  published_at?: string;
}

export interface ConceptSources {
  items: { id: number; title: string; url: string; platform: string; role: string }[];
  links: { label: string; url: string }[];
}

export interface Edition {
  served_on: string;
  lead: Concept | null;
  mentions: Concept[];
}

export interface TodayResponse {
  edition: Edition | null;
  sources?: ConceptSources;
  message?: string;
}

export interface AreaCoverage {
  area: ConceptArea;
  total: number;
  mastered: number;
  seen: number;
  unexplored: number;
}

export interface CoverageResponse {
  areas: AreaCoverage[];
  known_areas: ConceptArea[];
  recent: {
    id: number;
    slug: string;
    title: string;
    area: ConceptArea;
    difficulty: string;
    state: ConceptState;
    served_on: string;
  }[];
}

export interface ArchiveResponse {
  concepts: Concept[];
  total: number;
  limit: number;
  offset: number;
}

export interface DeliveryPrefs {
  serve_days: number[];
  serve_areas: ConceptArea[];
  email_concepts: boolean;
  known_areas?: ConceptArea[];
}

/** Postgres DOW ordering: 0 = Sunday. */
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface BenchmarkMovementRow {
  model_slug: string;
  model_name: string;
  creator: string;
  intelligence_now: number | null;
  intelligence_then: number | null;
  intelligence_delta: number | null;
  price_now: number | null;
  price_then: number | null;
  since: string;
  as_of: string;
}

export interface BenchmarkMovementResponse {
  movement: BenchmarkMovementRow[];
  snapshot_days: number;
  has_history: boolean;
}

// ─────────────────────────────────────────────────────────────────────

// ── Auth & Library types ─────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

export interface SavedItem extends Item {
  save_id: number;
  note: string | null;
  saved_at: string;
}

export interface AuthResponse {
  user: User;
}

export interface LibraryResponse {
  saves: SavedItem[];
}

export interface BenchmarkModel {
  id: string;
  name: string;
  slug: string;
  creator: string;
  creator_slug: string;
  intelligence_index: number | null;
  coding_index: number | null;
  output_tokens_per_second: number | null;
  time_to_first_token_seconds: number | null;
  price_1m_input: number | null;
  price_1m_output: number | null;
  price_1m_blended: number | null;
}

export interface BenchmarksResponse {
  models: BenchmarkModel[];
  fetched_at: number;
  attribution: string;
  stale?: boolean;
}

// ── API calls ────────────────────────────────────────────────────────

export const api = {
  getItems(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ItemsResponse>(`/items${qs}`);
  },

  getTopics() {
    return request<Topic[]>("/topics");
  },

  getBenchmarks() {
    return request<BenchmarksResponse>("/benchmarks");
  },

  getTopicDetail(slug: string, params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<TopicDetail>(`/topics/${slug}${qs}`);
  },

  getSources() {
    return request<Source[]>("/sources");
  },

  toggleSourceActive(id: number, is_active: boolean) {
    return request<Source>(`/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    });
  },

  toggleBookmark(id: number) {
    return request<Item>(`/items/${id}/bookmark`, { method: "PATCH" });
  },

  triggerFetch(fetcherKey?: string) {
    const path = fetcherKey ? `/fetch/${fetcherKey}` : "/fetch";
    return request<FetchStats>(path, { method: "POST" });
  },

  getHealth() {
    return request<{ status: string; timestamp: string }>("/health");
  },

  sendChat(message: string, history: ChatMessage[]) {
    return request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  },

  // ── Auth ──────────────────────────────────────────────────────────
  register(email: string, password: string, displayName?: string) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return request<{ ok: true }>("/auth/logout", { method: "POST" });
  },

  getMe() {
    return request<AuthResponse>("/auth/me");
  },

  deleteAccount() {
    return request<{ ok: true }>("/auth/me", { method: "DELETE" });
  },

  forgotPassword(email: string) {
    return request<{ ok: true }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, password: string) {
    return request<{ ok: true }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  // ── Library ───────────────────────────────────────────────────────
  getLibrary() {
    return request<LibraryResponse>("/library");
  },

  getSavedIds() {
    return request<{ savedIds: number[] }>("/library/ids");
  },

  saveItem(itemId: number, note?: string) {
    return request<{ save: object }>("/library", {
      method: "POST",
      body: JSON.stringify({ itemId, note }),
    });
  },

  unsaveItem(itemId: number) {
    return request<{ ok: true }>(`/library/${itemId}`, { method: "DELETE" });
  },

  updateSaveNote(itemId: number, note: string) {
    return request<{ save: object }>(`/library/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ note }),
    });
  },

  // ── Seen tracking ────────────────────────────────────────────────
  markSeen(item_ids: number[]) {
    return request<{ ok: boolean; marked: number }>("/items/seen", {
      method: "POST",
      body: JSON.stringify({ item_ids }),
    });
  },

  // ── Preferences ───────────────────────────────────────────────────
  getPrefs() {
    return request<UserPrefs>("/prefs");
  },

  followTopic(topicId: number) {
    return request<{ ok: boolean }>(`/prefs/topics/${topicId}`, { method: "POST" });
  },

  unfollowTopic(topicId: number) {
    return request<{ ok: boolean }>(`/prefs/topics/${topicId}`, { method: "DELETE" });
  },

  muteSource(sourceId: number) {
    return request<{ ok: boolean }>(`/prefs/sources/${sourceId}/mute`, { method: "POST" });
  },

  unmuteSource(sourceId: number) {
    return request<{ ok: boolean }>(`/prefs/sources/${sourceId}/mute`, { method: "DELETE" });
  },

  updateRole(role: string) {
    return request<{ ok: boolean; role: string }>("/prefs/role", {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  // ── Email digest ──────────────────────────────────────────────────
  subscribe(email: string, frequency: "weekly" | "daily" = "weekly") {
    return request<{ ok: true; message: string }>("/subscribe", {
      method: "POST",
      body: JSON.stringify({ email, frequency }),
    });
  },

  unsubscribe(email: string) {
    return request<{ ok: true }>(`/subscribe?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
  },

  getSubscriberCount() {
    return request<{ count: number }>("/subscribe/count");
  },

  // ── Concepts ──────────────────────────────────────────────────────
  getToday() {
    return request<TodayResponse>("/concepts/today");
  },

  getCoverage() {
    return request<CoverageResponse>("/concepts/coverage");
  },

  getConceptArchive(
    params: { area?: string; search?: string; limit?: number; offset?: number } = {}
  ) {
    const q = new URLSearchParams();
    if (params.area) q.set("area", params.area);
    if (params.search) q.set("search", params.search);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return request<ArchiveResponse>(`/concepts/archive${qs ? `?${qs}` : ""}`);
  },

  getConcept(slug: string) {
    return request<{ concept: Concept; sources: ConceptSources }>(
      `/concepts/${encodeURIComponent(slug)}`
    );
  },

  setConceptState(id: number, state: Exclude<ConceptState, "served">) {
    return request<{ ok: true; state: string }>(`/concepts/${id}/state`, {
      method: "POST",
      body: JSON.stringify({ state }),
    });
  },

  getDeliveryPrefs() {
    return request<DeliveryPrefs>("/concepts/prefs/delivery");
  },

  updateDeliveryPrefs(patch: Partial<Omit<DeliveryPrefs, "known_areas">>) {
    return request<{ ok: true } & DeliveryPrefs>("/concepts/prefs/delivery", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  getBenchmarkMovement(days = 30) {
    return request<BenchmarkMovementResponse>(`/benchmarks/movement?days=${days}`);
  },
};
