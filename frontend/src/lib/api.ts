const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
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
};
