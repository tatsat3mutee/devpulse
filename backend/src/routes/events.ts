import { Router } from "express";

const router = Router();

// confs.tech topic files most relevant to "AI & Tech".
// "data" is where confs.tech groups AI / ML / data-science conferences.
const TOPICS = ["data", "general", "python", "javascript", "devops", "security", "ux"];

interface ConfEvent {
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  city?: string;
  country?: string;
  online?: boolean;
  topic: string;
  cfpUrl?: string;
  cfpEndDate?: string;
}

// In-memory cache — the dataset changes slowly, so refresh every 6h.
let cache: { at: number; events: ConfEvent[] } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

async function fetchTopicYear(topic: string, year: number): Promise<ConfEvent[]> {
  const url = `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${year}/${topic}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map((r) => ({ ...(r as unknown as ConfEvent), topic }));
  } catch {
    return [];
  }
}

async function loadEvents(): Promise<ConfEvent[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.events;

  const year = new Date().getFullYear();
  const years = [year, year + 1];
  const jobs: Promise<ConfEvent[]>[] = [];
  for (const t of TOPICS) for (const y of years) jobs.push(fetchTopicYear(t, y));
  const all = (await Promise.all(jobs)).flat();

  const today = new Date().toISOString().split("T")[0];
  const seen = new Set<string>();
  const events = all
    .filter((e) => e.url && e.name && (e.endDate || e.startDate) >= today)
    .filter((e) => {
      if (seen.has(e.url)) return false;
      seen.add(e.url);
      return true;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  cache = { at: Date.now(), events };
  return events;
}

// GET /api/events?country=&city=&online=&limit=
router.get("/", async (req, res) => {
  try {
    const events = await loadEvents();
    const country = String(req.query.country || "").toLowerCase();
    const city = String(req.query.city || "").toLowerCase();
    const includeOnline = req.query.online !== "false";
    const limit = Math.min(Number(req.query.limit) || 200, 500);

    let filtered = events;
    if (country) filtered = filtered.filter((e) => (e.country || "").toLowerCase() === country);
    if (city) filtered = filtered.filter((e) => (e.city || "").toLowerCase().includes(city));
    if (!includeOnline) filtered = filtered.filter((e) => !e.online || !!e.city);

    // Country facets for the location selector (derived from the full set).
    const countries = Array.from(
      new Set(events.map((e) => e.country).filter((c): c is string => !!c))
    ).sort((a, b) => a.localeCompare(b));

    res.json({
      events: filtered.slice(0, limit),
      total: filtered.length,
      countries,
    });
  } catch (err) {
    console.error("Events error:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

export default router;
