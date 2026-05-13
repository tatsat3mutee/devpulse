import { useEffect, useState } from "react";
import { api, LearnBook, LearnChapter } from "../lib/api";
import Icon from "../components/Icon";

const BOOK_COLORS: Record<string, string> = {
  "udlbook":                      "from-indigo-500/15 to-purple-500/15 border-indigo-400/25",
  "harness-engineering":          "from-emerald-500/15 to-teal-500/15 border-emerald-400/25",
  "ai-engineering-from-scratch":  "from-amber-500/15 to-orange-500/15 border-amber-400/25",
};

const BOOK_ICON_COLOR: Record<string, string> = {
  "udlbook":                      "text-indigo-400",
  "harness-engineering":          "text-emerald-400",
  "ai-engineering-from-scratch":  "text-amber-400",
};

export default function LearnPage() {
  const [books, setBooks] = useState<Omit<LearnBook, "chapters">[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [bookDetail, setBookDetail] = useState<LearnBook | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getLearnBooks()
      .then(({ books }) => setBooks(books))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleBook = async (slug: string) => {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
      setBookDetail(null);
      return;
    }
    setExpandedSlug(slug);
    setDetailLoading(true);
    try {
      const detail = await api.getLearnBook(slug);
      setBookDetail(detail);
      const n: Record<string, string> = {};
      for (const ch of detail.chapters) {
        if (ch.note) n[ch.id] = ch.note;
      }
      setNotes(n);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleChapter = async (slug: string, chapterId: string) => {
    const res = await api.toggleChapter(slug, chapterId);
    setBookDetail(prev => {
      if (!prev) return prev;
      const chapters = prev.chapters.map(ch =>
        ch.id === chapterId ? { ...ch, status: res.status as LearnChapter["status"] } : ch
      );
      const done = chapters.filter(c => c.status === "done").length;
      return { ...prev, chapters, chapters_done: done, percent: Math.round((done / chapters.length) * 100) };
    });
    setBooks(prev => prev.map(b => {
      if (b.slug !== slug) return b;
      const delta = res.status === "done" ? 1 : -1;
      const done = Math.max(0, b.chapters_done + delta);
      return { ...b, chapters_done: done, percent: Math.round((done / b.chapters_total) * 100) };
    }));
  };

  const handleNoteChange = (chapterId: string, value: string) => {
    setNotes(prev => ({ ...prev, [chapterId]: value }));
  };

  const handleNoteSave = async (slug: string, chapterId: string) => {
    setSavingNote(chapterId);
    try {
      await api.updateChapterNote(slug, chapterId, notes[chapterId] ?? "");
    } finally {
      setSavingNote(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-3 w-24 bg-surface rounded mb-6" />
        <div className="h-8 w-64 bg-surface rounded mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-36 bg-surface border border-line rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Journal Club</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">Learn</h1>
        <p className="text-ink-muted text-[14px] max-w-xl leading-relaxed">
          Track your reading progress through curated technical resources. Check off chapters, take notes, and see how far you've come.
        </p>
      </header>

      <div className="space-y-4">
        {books.map(book => {
          const isExpanded = expandedSlug === book.slug;
          const colorClass = BOOK_COLORS[book.slug] ?? "from-ink/10 to-ink/5 border-line";
          const iconColor = BOOK_ICON_COLOR[book.slug] ?? "text-ink-muted";

          return (
            <div key={book.slug} className="border border-line rounded-xl overflow-hidden">
              {/* Book card header */}
              <button
                onClick={() => toggleBook(book.slug)}
                className={`w-full text-left p-5 bg-gradient-to-br ${colorClass} transition-opacity hover:opacity-90`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className={`mt-0.5 shrink-0 ${iconColor}`}>
                      <Icon name="book" size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-[16px] text-ink leading-snug">{book.title}</h2>
                      {book.author && (
                        <p className="text-[12px] text-ink-muted mt-0.5">{book.author}</p>
                      )}
                      {book.description && (
                        <p className="text-[13px] text-ink-soft mt-2 leading-relaxed line-clamp-2">{book.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[13px] font-medium text-ink">{book.chapters_done} / {book.chapters_total}</div>
                    <div className="text-[11px] text-ink-faint">{book.percent}% done</div>
                    <div className="w-20 h-1.5 bg-paper/50 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${book.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[11.5px] text-ink-faint">
                  <a
                    href={book.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="hover:text-ink underline underline-offset-2"
                  >
                    Open resource ↗
                  </a>
                  <span className="ml-auto">{isExpanded ? "▲ collapse" : "▼ expand"}</span>
                </div>
              </button>

              {/* Chapter list */}
              {isExpanded && (
                <div className="bg-paper">
                  {detailLoading || !bookDetail || bookDetail.slug !== book.slug ? (
                    <div className="p-4 space-y-2 animate-pulse">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-8 bg-surface rounded" />
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-line">
                      {bookDetail.chapters.map((ch, idx) => {
                        const isDone = ch.status === "done";
                        return (
                          <div key={ch.id} className={`px-5 py-3 ${isDone ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleChapter(book.slug, ch.id)}
                                className={`shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center ${
                                  isDone
                                    ? "bg-accent border-accent text-paper"
                                    : "border-line bg-surface hover:border-ink/30"
                                }`}
                                aria-label={isDone ? "Mark as unread" : "Mark as done"}
                              >
                                {isDone && <Icon name="check" size={11} />}
                              </button>
                              <span className="text-[11px] text-ink-faint font-mono w-5 shrink-0 text-right">{idx + 1}</span>
                              <a
                                href={ch.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex-1 text-[13.5px] font-medium hover:text-accent transition-colors ${
                                  isDone ? "line-through text-ink-muted" : "text-ink"
                                }`}
                              >
                                {ch.title}
                              </a>
                            </div>
                            <div className="ml-14 mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Add a note…"
                                value={notes[ch.id] ?? ""}
                                onChange={e => handleNoteChange(ch.id, e.target.value)}
                                onBlur={() => handleNoteSave(book.slug, ch.id)}
                                onKeyDown={e => { if (e.key === "Enter") handleNoteSave(book.slug, ch.id); }}
                                className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-line bg-surface text-ink-soft placeholder:text-ink-faint focus:outline-none focus:border-ink/30 focus:ring-1 focus:ring-ink/5"
                              />
                              {savingNote === ch.id && (
                                <span className="text-[10px] text-ink-faint shrink-0">saving…</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {books.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="display text-[22px] text-ink-soft mb-1">No books found.</p>
            <p className="text-[13.5px] text-ink-muted">The reading list will appear after the server initialises.</p>
          </div>
        )}
      </div>
    </div>
  );
}
