/**
 * localStorage bookmark management for unauthenticated users.
 * Bookmarks are stored as lightweight item snapshots so the Library
 * page can render them without an API call.
 */

export const LOCAL_BOOKMARKS_KEY = "devpulse:bookmarks";

export interface LocalBookmark {
  id: number;
  title: string;
  url: string;
  platform: string;
  type: string;
  topic_name?: string;
  topic_slug?: string;
  source_name?: string;
  description?: string;
  published_at: string;
  tags: string[];
  score: number;
  metadata: Record<string, unknown>;
  savedAt: string;
}

export function getLocalBookmarks(): LocalBookmark[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKMARKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalBookmark[];
  } catch {
    return [];
  }
}

export function isLocalBookmarked(itemId: number): boolean {
  return getLocalBookmarks().some((b) => b.id === itemId);
}

export function addLocalBookmark(item: LocalBookmark): void {
  const existing = getLocalBookmarks();
  if (existing.some((b) => b.id === item.id)) return;
  localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify([item, ...existing]));
}

export function removeLocalBookmark(itemId: number): void {
  const updated = getLocalBookmarks().filter((b) => b.id !== itemId);
  localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(updated));
}

export function clearLocalBookmarks(): void {
  localStorage.removeItem(LOCAL_BOOKMARKS_KEY);
}

export function localBookmarkCount(): number {
  return getLocalBookmarks().length;
}
