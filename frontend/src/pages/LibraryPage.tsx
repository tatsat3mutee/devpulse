import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type SavedItem, type Item } from "../lib/api";
import FeedItem from "../components/FeedItem";
import { useAuth } from "../context/AuthContext";
import {
  getLocalBookmarks,
  removeLocalBookmark,
  localBookmarkCount,
  type LocalBookmark,
} from "../lib/localBookmarks";

/** Convert a LocalBookmark snapshot into the Item shape FeedItem expects */
function localToItem(b: LocalBookmark): Item {
  return {
    id: b.id,
    title: b.title,
    url: b.url,
    platform: b.platform,
    type: b.type as Item["type"],
    topic_name: b.topic_name,
    topic_slug: b.topic_slug,
    source_name: b.source_name,
    description: b.description ?? null,
    published_at: b.published_at,
    fetched_at: b.savedAt,
    tags: b.tags,
    score: b.score,
    is_bookmarked: true,
    metadata: b.metadata as Record<string, any>,
  };
}

export default function LibraryPage() {
  const { user, unsaveItem } = useAuth();

  // ── Authenticated path ──────────────────────────────────────────────
  const [saves, setSaves] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  // ── Guest path ──────────────────────────────────────────────────────
  const [localItems, setLocalItems] = useState<LocalBookmark[]>([]);

  useEffect(() => {
    if (user) {
      api.getLibrary()
        .then(({ saves }) => setSaves(saves))
        .finally(() => setLoading(false));
    } else {
      setLocalItems(getLocalBookmarks());
      setLoading(false);
    }
  }, [user]);

  const sortedServer = sort === "newest" ? saves : [...saves].reverse();

  const handleRemoveServer = async (itemId: number) => {
    setSaves((prev) => prev.filter((s) => s.id !== itemId));
    try {
      await unsaveItem(itemId);
    } catch {
      api.getLibrary().then(({ saves }) => setSaves(saves));
    }
  };

  const handleRemoveLocal = (itemId: number) => {
    removeLocalBookmark(itemId);
    setLocalItems((prev) => prev.filter((b) => b.id !== itemId));
  };

  const count = user ? saves.length : localItems.length;

  const header = (
    <header className="mb-8 pb-5 border-b border-line">
      <div className="eyebrow mb-2">Personal</div>
      <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">Library</h1>
      <p className="text-ink-muted text-[14px] max-w-xl">
        Your saved articles, papers, repos, and discussions — all in one place.
      </p>
    </header>
  );

  if (loading) return (
    <div>
      {header}
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface border border-line rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );

  // ── Guest view ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <div>
        {header}

        {/* Sign-in nudge — always shown for guests */}
        <div className="flex items-start gap-3 bg-surface border border-line rounded-lg p-4 mb-6">
          <div className="flex-1">
            <p className="text-[13.5px] font-medium text-ink mb-0.5">
              {localBookmarkCount() >= 3
                ? `You have ${localBookmarkCount()} saved items — sign in to sync across devices.`
                : "Bookmarks are saved locally. Sign in to sync them across devices."}
            </p>
            <p className="text-[12px] text-ink-muted">Free account, no credit card, never required.</p>
          </div>
          <Link
            to="/login"
            className="shrink-0 px-3 py-1.5 rounded-md bg-ink text-paper text-[12.5px] font-medium hover:bg-ink-soft transition-colors"
          >
            Sign in
          </Link>
        </div>

        {localItems.length === 0 ? (
          <div className="text-center py-24">
            <p className="display text-[28px] text-ink-soft mb-2">Nothing saved yet.</p>
            <p className="text-[13.5px] text-ink-muted mb-6">
              Hit the bookmark icon on any item in the feed to save it here — no account needed.
            </p>
            <Link
              to="/feed"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft transition-colors"
            >
              Browse the feed →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <span className="text-[12px] text-ink-faint font-mono">{localItems.length} saved locally</span>
            </div>
            <div className="space-y-2.5">
              {localItems.map((b) => (
                <div key={b.id} className="relative group/save">
                  <FeedItem item={localToItem(b)} showTopic />
                  <button
                    onClick={() => handleRemoveLocal(b.id)}
                    className="absolute top-3 right-10 text-[10.5px] text-ink-faint opacity-0 group-hover/save:opacity-100 hover:text-rose-500 transition-all uppercase tracking-wider font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Authenticated view ──────────────────────────────────────────────
  return (
    <div>
      {header}
      {count === 0 ? (
        <div className="text-center py-24">
          <p className="display text-[28px] text-ink-soft mb-2">Nothing saved yet.</p>
          <p className="text-[13.5px] text-ink-muted mb-6">
            Hit the bookmark icon on any item in the feed to save it here.
          </p>
          <Link
            to="/feed"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft transition-colors"
          >
            Browse the feed →
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <span className="text-[12px] text-ink-faint font-mono">{count} saved</span>
            <div className="flex gap-px bg-paper border border-line rounded-md p-0.5">
              {(["newest", "oldest"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3 py-1 text-[11.5px] font-medium uppercase tracking-wider rounded transition-colors capitalize ${
                    sort === s ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {sortedServer.map((save) => (
              <div key={save.save_id} className="relative group/save">
                <FeedItem item={save} showTopic note={save.note} />
                <button
                  onClick={() => handleRemoveServer(save.id)}
                  className="absolute top-3 right-10 text-[10.5px] text-ink-faint opacity-0 group-hover/save:opacity-100 hover:text-rose-500 transition-all uppercase tracking-wider font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
