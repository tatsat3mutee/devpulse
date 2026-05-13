const BASE = (import.meta.env.VITE_API_URL ?? "") + "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
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

export interface KnowledgeGuide {
  id: number;
  title: string;
  slug: string;
  category: string;
  content?: string;
  icon: string;
  difficulty: string;
  tags: string[];
  created_at: string;
  updated_at: string;
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

// ── Learn types ──────────────────────────────────────────────────────

export interface LearnChapter {
  id: string;
  title: string;
  url: string;
  status: "done" | "reading" | null;
  note: string | null;
}

export interface LearnBook {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  url: string;
  description: string | null;
  chapters: LearnChapter[];
  chapters_total: number;
  chapters_done: number;
  percent: number;
}

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

// ── API calls ────────────────────────────────────────────────────────

export const api = {
  getItems(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ItemsResponse>(`/items${qs}`);
  },

  getTopics() {
    return request<Topic[]>("/topics");
  },

  getTopicDetail(slug: string, params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<TopicDetail>(`/topics/${slug}${qs}`);
  },

  getTrendingDaily() {
    return request<{ topic_id: number; topic_name: string; topic_slug: string; day: string; count: number }[]>(
      "/topics/trending/daily"
    );
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

  getKnowledgeGuides(category?: string) {
    const qs = category ? `?category=${category}` : "";
    return request<KnowledgeGuide[]>(`/knowledge${qs}`);
  },

  getKnowledgeGuide(slug: string) {
    return request<KnowledgeGuide>(`/knowledge/${slug}`);
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

  // ── Learn / Reading tracker ───────────────────────────────────────
  getLearnBooks() {
    return request<{ books: Omit<LearnBook, "chapters">[] }>("/learn/books");
  },

  getLearnBook(slug: string) {
    return request<LearnBook>(`/learn/books/${slug}`);
  },

  toggleChapter(slug: string, chapterId: string) {
    return request<{ ok: boolean; status: string }>(`/learn/books/${slug}/chapters/${chapterId}`, {
      method: "POST",
    });
  },

  updateChapterNote(slug: string, chapterId: string, note: string) {
    return request<{ ok: boolean }>(`/learn/books/${slug}/chapters/${chapterId}`, {
      method: "PATCH",
      body: JSON.stringify({ note }),
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
};
