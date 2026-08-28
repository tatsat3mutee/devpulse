import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Concept, type ConceptSources } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { setPageMeta } from "../lib/seo";
import ConceptArticle from "../components/ConceptArticle";
import Icon from "../components/Icon";

/** A single concept, reached from the archive, coverage, or an emailed link. */
export default function ConceptPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [concept, setConcept] = useState<Concept | null>(null);
  const [sources, setSources] = useState<ConceptSources | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getConcept(slug)
      .then((res) => {
        if (cancelled) return;
        setConcept(res.concept);
        setSources(res.sources);
        setPageMeta({ title: res.concept.title, description: res.concept.hook });
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[42rem] animate-pulse space-y-4">
        <div className="h-3 w-32 bg-surface rounded" />
        <div className="h-10 w-full bg-surface rounded" />
        <div className="h-4 w-full bg-surface rounded mt-6" />
        <div className="h-4 w-4/5 bg-surface rounded" />
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="max-w-lg py-8">
        <h1 className="display text-[26px] text-ink mb-3">Concept not found</h1>
        <p className="text-[15px] text-ink-muted mb-6">{error ?? "That concept doesn't exist."}</p>
        <Link to="/archive" className="text-[13px] font-medium text-accent hover:underline">
          Browse the archive →
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        to="/archive"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-faint hover:text-ink mb-6 transition-colors"
      >
        <Icon name="arrow-left" size={12} /> Archive
      </Link>

      {/* Disposition only makes sense for a concept that was actually served
          to this user — otherwise there is no ledger row to update. */}
      <ConceptArticle
        concept={concept}
        sources={sources}
        canDispose={Boolean(user && concept.state)}
      />
    </>
  );
}
