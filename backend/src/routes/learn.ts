import { Router, Response } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

const BOOKS = [
  {
    slug: "udlbook",
    title: "Understanding Deep Learning",
    author: "Simon J.D. Prince",
    url: "https://udlbook.github.io/udlbook/",
    description: "A comprehensive introduction to deep learning covering all major architectures and techniques.",
    chapters: [
      { id: "ch1",  title: "Introduction",                          url: "https://udlbook.github.io/udlbook/" },
      { id: "ch2",  title: "Supervised Learning",                   url: "https://udlbook.github.io/udlbook/" },
      { id: "ch3",  title: "Shallow Neural Networks",               url: "https://udlbook.github.io/udlbook/" },
      { id: "ch4",  title: "Deep Neural Networks",                  url: "https://udlbook.github.io/udlbook/" },
      { id: "ch5",  title: "Loss Functions",                        url: "https://udlbook.github.io/udlbook/" },
      { id: "ch6",  title: "Fitting Models",                        url: "https://udlbook.github.io/udlbook/" },
      { id: "ch7",  title: "Gradients and Initialisation",         url: "https://udlbook.github.io/udlbook/" },
      { id: "ch8",  title: "Measuring Performance",                 url: "https://udlbook.github.io/udlbook/" },
      { id: "ch9",  title: "Regularisation",                        url: "https://udlbook.github.io/udlbook/" },
      { id: "ch10", title: "Convolutional Networks",                url: "https://udlbook.github.io/udlbook/" },
      { id: "ch11", title: "Residual Networks",                     url: "https://udlbook.github.io/udlbook/" },
      { id: "ch12", title: "Transformers",                          url: "https://udlbook.github.io/udlbook/" },
      { id: "ch13", title: "Graph Neural Networks",                 url: "https://udlbook.github.io/udlbook/" },
      { id: "ch14", title: "Unsupervised Learning",                 url: "https://udlbook.github.io/udlbook/" },
      { id: "ch15", title: "Generative Adversarial Networks",       url: "https://udlbook.github.io/udlbook/" },
      { id: "ch16", title: "Normalising Flows",                     url: "https://udlbook.github.io/udlbook/" },
      { id: "ch17", title: "Diffusion Models",                      url: "https://udlbook.github.io/udlbook/" },
      { id: "ch18", title: "Reinforcement Learning",                url: "https://udlbook.github.io/udlbook/" },
      { id: "ch19", title: "Why Does Deep Learning Work?",          url: "https://udlbook.github.io/udlbook/" },
      { id: "ch20", title: "Ethics and AI",                         url: "https://udlbook.github.io/udlbook/" },
    ],
  },
  {
    slug: "harness-engineering",
    title: "Learn Harness Engineering",
    author: "Walking Labs",
    url: "https://walkinglabs.github.io/learn-harness-engineering/en/",
    description: "Hands-on guide to building CI/CD pipelines, stages, and deployments with Harness.",
    chapters: [
      { id: "ch1", title: "Overview",       url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
      { id: "ch2", title: "Setup",          url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
      { id: "ch3", title: "Pipelines",      url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
      { id: "ch4", title: "Stages",         url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
      { id: "ch5", title: "Tests",          url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
      { id: "ch6", title: "Deployments",    url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
      { id: "ch7", title: "Governance",     url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
      { id: "ch8", title: "Best Practices", url: "https://walkinglabs.github.io/learn-harness-engineering/en/" },
    ],
  },
  {
    slug: "ai-engineering-from-scratch",
    title: "AI Engineering from Scratch",
    author: "AI Engineering from Scratch",
    url: "https://aiengineeringfromscratch.com/",
    description: "Build production AI systems from the ground up: RAG, agents, evals, and observability.",
    chapters: [
      { id: "m1",  title: "Foundations",    url: "https://aiengineeringfromscratch.com/" },
      { id: "m2",  title: "Prompting",      url: "https://aiengineeringfromscratch.com/" },
      { id: "m3",  title: "RAG",            url: "https://aiengineeringfromscratch.com/" },
      { id: "m4",  title: "Embeddings",     url: "https://aiengineeringfromscratch.com/" },
      { id: "m5",  title: "Fine-tuning",    url: "https://aiengineeringfromscratch.com/" },
      { id: "m6",  title: "Evals",          url: "https://aiengineeringfromscratch.com/" },
      { id: "m7",  title: "Agents",         url: "https://aiengineeringfromscratch.com/" },
      { id: "m8",  title: "Production",     url: "https://aiengineeringfromscratch.com/" },
      { id: "m9",  title: "Observability",  url: "https://aiengineeringfromscratch.com/" },
      { id: "m10", title: "Capstone",       url: "https://aiengineeringfromscratch.com/" },
    ],
  },
];

export async function initLearnTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learn_books (
      id          SERIAL PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      author      TEXT,
      url         TEXT NOT NULL,
      description TEXT,
      chapters    JSONB NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS user_chapter_progress (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id    INTEGER NOT NULL REFERENCES learn_books(id) ON DELETE CASCADE,
      chapter_id TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'reading',
      note       TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, book_id, chapter_id)
    );
    CREATE INDEX IF NOT EXISTS idx_progress_user_book ON user_chapter_progress(user_id, book_id);
  `);

  for (const book of BOOKS) {
    await pool.query(
      `INSERT INTO learn_books (slug, title, author, url, description, chapters)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO NOTHING`,
      [book.slug, book.title, book.author, book.url, book.description, JSON.stringify(book.chapters)]
    );
  }
  console.log("📚 Learn tables initialised");
}

// GET /api/learn/books — list all books with user progress %
router.get("/books", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.userId!;
    const booksRes = await pool.query(`SELECT * FROM learn_books ORDER BY id`);
    const progressRes = await pool.query(
      `SELECT book_id, chapter_id, status FROM user_chapter_progress WHERE user_id = $1`,
      [uid]
    );

    const progressByBook: Record<number, Set<string>> = {};
    for (const row of progressRes.rows) {
      if (row.status === "done") {
        if (!progressByBook[row.book_id]) progressByBook[row.book_id] = new Set();
        progressByBook[row.book_id].add(row.chapter_id);
      }
    }

    const books = booksRes.rows.map(b => {
      const total = (b.chapters as unknown[]).length;
      const done = progressByBook[b.id]?.size ?? 0;
      return { ...b, chapters_total: total, chapters_done: done, percent: total ? Math.round((done / total) * 100) : 0 };
    });

    res.json({ books });
  } catch (err) {
    console.error("GET /learn/books error:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// GET /api/learn/books/:slug — book detail + chapter list + user progress
router.get("/books/:slug", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.userId!;
    const bookRes = await pool.query(`SELECT * FROM learn_books WHERE slug = $1`, [req.params.slug]);
    if (bookRes.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    const book = bookRes.rows[0];

    const progressRes = await pool.query(
      `SELECT chapter_id, status, note FROM user_chapter_progress WHERE user_id = $1 AND book_id = $2`,
      [uid, book.id]
    );
    const progressMap: Record<string, { status: string; note: string | null }> = {};
    for (const row of progressRes.rows) {
      progressMap[row.chapter_id] = { status: row.status, note: row.note };
    }

    const chapters = (book.chapters as Array<{ id: string; title: string; url: string }>).map(ch => ({
      ...ch,
      status: progressMap[ch.id]?.status ?? null,
      note: progressMap[ch.id]?.note ?? null,
    }));

    const done = chapters.filter(c => c.status === "done").length;
    res.json({
      ...book,
      chapters,
      chapters_total: chapters.length,
      chapters_done: done,
      percent: chapters.length ? Math.round((done / chapters.length) * 100) : 0,
    });
  } catch (err) {
    console.error("GET /learn/books/:slug error:", err);
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

// POST /api/learn/books/:slug/chapters/:chapterId — toggle chapter done/reading
router.post("/books/:slug/chapters/:chapterId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.userId!;
    const bookRes = await pool.query(`SELECT id FROM learn_books WHERE slug = $1`, [req.params.slug]);
    if (bookRes.rows.length === 0) { res.status(404).json({ error: "Book not found" }); return; }
    const bookId = bookRes.rows[0].id;

    const existing = await pool.query(
      `SELECT status FROM user_chapter_progress WHERE user_id = $1 AND book_id = $2 AND chapter_id = $3`,
      [uid, bookId, req.params.chapterId]
    );
    const newStatus = existing.rows[0]?.status === "done" ? "reading" : "done";

    await pool.query(
      `INSERT INTO user_chapter_progress (user_id, book_id, chapter_id, status, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, book_id, chapter_id) DO UPDATE SET status = $4, updated_at = NOW()`,
      [uid, bookId, req.params.chapterId, newStatus]
    );
    res.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("POST /learn/books/:slug/chapters error:", err);
    res.status(500).json({ error: "Failed to toggle chapter" });
  }
});

// PATCH /api/learn/books/:slug/chapters/:chapterId — update note
router.patch("/books/:slug/chapters/:chapterId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.userId!;
    const { note } = req.body as { note?: string };
    const bookRes = await pool.query(`SELECT id FROM learn_books WHERE slug = $1`, [req.params.slug]);
    if (bookRes.rows.length === 0) { res.status(404).json({ error: "Book not found" }); return; }
    const bookId = bookRes.rows[0].id;

    await pool.query(
      `INSERT INTO user_chapter_progress (user_id, book_id, chapter_id, status, note, updated_at)
       VALUES ($1, $2, $3, 'reading', $4, NOW())
       ON CONFLICT (user_id, book_id, chapter_id) DO UPDATE SET note = $4, updated_at = NOW()`,
      [uid, bookId, req.params.chapterId, note ?? null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /learn/books/:slug/chapters error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

export default router;
