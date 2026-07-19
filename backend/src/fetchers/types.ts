export interface FetchResult {
  title: string;
  description: string | null;
  url: string;
  type: "paper" | "repo" | "social" | "news" | "video" | "article";
  platform: string;
  tags: string[];
  publishedAt: Date | null;
  metadata?: Record<string, unknown>;
  imageUrl?: string;
  author?: string;
  duration?: string;
}

export type FetcherFn = (sourceUrl: string) => Promise<FetchResult[]>;
