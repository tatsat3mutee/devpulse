import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Concept, type ConceptSources, type TodayResponse } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ConceptArticle from "../components/ConceptArticle";

/**
 * The front door: one served concept.
 *
 * The reader is meant to finish this page and leave. There is exactly one thing
 * to read, a few one-liners beneath it, and two ways to dispose of it — the
 * "finishable" issue that slow-news publishers and curation practitioners
 * independently converge on.
 */
type Sample = { concept: Concept; sources: ConceptSources };

export default function TodayPage() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Signed out, the front door still serves a real concept. The archive and
    // every /concept/:slug are already public, so showing only a pitch here was
    // hiding readable work behind a login for nothing.
    const load = user
      ? api.getToday().then((res) => { if (!cancelled) setData(res); })
      : api.getConceptArchive({ limit: 1 }).then(async (res) => {
          const top = res.concepts[0];
          if (!top || cancelled) return;
          const full = await api.getConcept(top.slug);
          if (!cancelled) setSample(full);
        });

    load
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user]);

  // A failed sample fetch degrades to the pitch alone rather than an error page.
  if (!user) return <SignedOut sample={sample} loading={loading} />;
  if (loading) return <TodaySkeleton />;
  if (error) return <Empty title="Couldn't load today's concept" body={error} />;

  const lead = data?.edition?.lead;
  if (!lead) {
    return (
      <Empty
        title="Nothing new for you yet"
        body="Every concept in your areas has already been served. New ones are extracted nightly — check back after the next delivery day."
      />
    );
  }

  return (
    <>
      <ConceptArticle concept={lead} sources={data?.sources} canDispose />

      {data?.edition?.mentions.length ? (
        <section className="max-w-[42rem] mt-12 pt-8 border-t border-line">
          <p className="eyebrow text-ink-faint mb-4">Also worth knowing</p>
          <ul className="space-y-3">
            {data.edition.mentions.map((m) => (
              <MentionRow key={m.id} concept={m} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function MentionRow({ concept }: { concept: Concept }) {
  return (
    <li>
      <Link
        to={`/concept/${concept.slug}`}
        className="group block rounded-lg -mx-3 px-3 py-2.5 hover:bg-surface transition-colors"
      >
        <p className="text-[14px] font-medium text-ink group-hover:text-accent transition-colors">
          {concept.title}
        </p>
        <p className="text-[13px] text-ink-muted mt-0.5 leading-relaxed">{concept.hook}</p>
      </Link>
    </li>
  );
}

function SignedOut({ sample, loading }: { sample: Sample | null; loading: boolean }) {
  return (
    <>
      <div className="max-w-[42rem] pb-8 mb-10 border-b border-line">
        <h1 className="display text-[32px] text-ink mb-3">One idea, twice a week.</h1>
        <p className="text-[15px] leading-relaxed text-ink-muted mb-6">
          DevPulse reads the AI firehose and throws almost all of it away. What's left is a
          mechanism you can learn in ten minutes and explain to someone else — with the
          number that makes it concrete, and a draft if you want to post about it.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft transition-colors"
        >
          Sign in to start
        </Link>
      </div>

      {loading && <TodaySkeleton />}

      {!loading && sample && (
        <>
          <p className="eyebrow text-ink-faint mb-5 max-w-[42rem]">
            Here's one, in full — this is the whole format
          </p>
          <ConceptArticle concept={sample.concept} sources={sample.sources} />
          <div className="max-w-[42rem] mt-10 pt-6 border-t border-line">
            <Link to="/archive" className="text-[13px] font-medium text-accent hover:underline">
              Read every concept we've published →
            </Link>
          </div>
        </>
      )}
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-lg py-8">
      <h1 className="display text-[26px] text-ink mb-3">{title}</h1>
      <p className="text-[15px] leading-relaxed text-ink-muted mb-6">{body}</p>
      <Link to="/archive" className="text-[13px] font-medium text-accent hover:underline">
        Browse the archive →
      </Link>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="max-w-[42rem] animate-pulse space-y-4">
      <div className="h-3 w-32 bg-surface rounded" />
      <div className="h-10 w-full bg-surface rounded" />
      <div className="h-10 w-2/3 bg-surface rounded" />
      <div className="h-4 w-full bg-surface rounded mt-6" />
      <div className="h-4 w-full bg-surface rounded" />
      <div className="h-4 w-4/5 bg-surface rounded" />
      <div className="h-28 bg-surface rounded-xl mt-6" />
    </div>
  );
}
