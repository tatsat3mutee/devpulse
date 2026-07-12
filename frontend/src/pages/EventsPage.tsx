import { useEffect, useMemo, useState } from "react";
import { api, ConfEvent } from "../lib/api";
import Icon from "../components/Icon";

const LOCATION_KEY = "devpulse:eventCountry";

function fmtRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (start === end) return s.toLocaleDateString(undefined, { ...opts, year: "numeric" });
  if (sameMonth) return `${s.toLocaleDateString(undefined, opts)} – ${e.getDate()}, ${e.getFullYear()}`;
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

export default function EventsPage() {
  const [data, setData] = useState<{ events: ConfEvent[]; countries: string[] }>({ events: [], countries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [country, setCountry] = useState<string>(() => localStorage.getItem(LOCATION_KEY) || "");
  const [cityQuery, setCityQuery] = useState("");
  const [includeOnline, setIncludeOnline] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getEvents({ country: country || undefined, online: includeOnline })
      .then((res) => setData({ events: res.events, countries: res.countries }))
      .catch(() => setError("Couldn't load events right now."))
      .finally(() => setLoading(false));
  }, [country, includeOnline]);

  const handleCountry = (c: string) => {
    localStorage.setItem(LOCATION_KEY, c);
    setCountry(c);
  };

  const events = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return data.events;
    return data.events.filter((e) => (e.city || "").toLowerCase().includes(q));
  }, [data.events, cityQuery]);

  return (
    <div>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Near you</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">AI &amp; Tech events</h1>
        <p className="text-ink-muted text-[14px] max-w-xl">
          Upcoming AI, ML and developer conferences worldwide. Pick your country to see what's on — or
          search a city. Sourced from the open <span className="text-ink-soft">confs.tech</span> dataset.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <select
          value={country}
          onChange={(e) => handleCountry(e.target.value)}
          className="text-[13px] bg-surface border border-line rounded-md px-3 py-2 text-ink-soft hover:border-ink/30 focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
        >
          <option value="">All countries</option>
          {data.countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={14} />
          </span>
          <input
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            placeholder="Filter by city…"
            className="w-full text-[13px] bg-surface border border-line rounded-md pl-9 pr-3 py-2 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-muted select-none px-1">
          <input
            type="checkbox"
            checked={includeOnline}
            onChange={(e) => setIncludeOnline(e.target.checked)}
            className="accent-accent"
          />
          Include online
        </label>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface border border-line rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-[13.5px] text-ink-muted py-10 text-center">{error}</p>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <p className="display text-[24px] text-ink-soft mb-1">No upcoming events found.</p>
          <p className="text-[13px] text-ink-muted">Try another country, clear the city filter, or include online events.</p>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-ink-faint font-mono mb-4">{events.length} upcoming</p>
          <div className="space-y-2.5">
            {events.map((e) => (
              <a
                key={e.url}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 bg-surface border border-line rounded-xl px-5 py-4 hover:border-ink/20 hover:shadow-cardHover transition-all"
              >
                <div className="shrink-0 w-11 text-center">
                  <Icon name="calendar" size={18} className="mx-auto text-ink-faint group-hover:text-accent transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-ink leading-snug group-hover:text-accent transition-colors">
                    {e.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[12px] text-ink-muted">
                    <span className="font-mono">{fmtRange(e.startDate, e.endDate)}</span>
                    <span className="text-ink-faint/60">·</span>
                    <span>
                      {e.online && !e.city ? "Online" : [e.city, e.country].filter(Boolean).join(", ")}
                      {e.online && e.city ? " · hybrid" : ""}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-line text-ink-faint uppercase tracking-wide">
                      {e.topic}
                    </span>
                  </div>
                </div>
                {e.cfpUrl && (
                  <span className="hidden sm:inline shrink-0 self-center text-[11px] font-medium text-accent">
                    CFP open
                  </span>
                )}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
