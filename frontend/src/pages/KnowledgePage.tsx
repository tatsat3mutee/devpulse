import { useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { api, KnowledgeGuide } from "../lib/api";
import { setPageMeta } from "../lib/seo";

export default function KnowledgePage() {
  const { slug } = useParams<{ slug: string }>();

  if (slug) return <GuideDetail slug={slug} />;
  return <GuideList />;
}

function GuideList() {
  const [guides, setGuides] = useState<KnowledgeGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  useEffect(() => {
    setLoading(true);
    api.getKnowledgeGuides(category || undefined)
      .then(setGuides)
      .finally(() => setLoading(false));
  }, [category]);

  const categories = [
    { value: "", label: "All", icon: "📚" },
    { value: "copilot", label: "Copilot", icon: "🤖" },
    { value: "vscode", label: "VS Code", icon: "⚡" },
    { value: "mcp", label: "MCP", icon: "🔌" },
    { value: "ai-tools", label: "AI Tools", icon: "🏗️" },
    { value: "cloud", label: "Cloud", icon: "☁️" },
  ];

  const difficultyColor: Record<string, string> = {
    beginner: "text-accent",
    intermediate: "text-ink-soft",
    advanced: "text-ink",
  };

  return (
    <div>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2">Read</div>
        <h1 className="display text-[26px] sm:text-[32px] md:text-[38px] text-ink mb-2">
          Guides, written to <span className="italic text-ink-soft">be re-read.</span>
        </h1>
        <p className="text-ink-muted text-[14px] max-w-2xl">
          Long-form notes on Copilot, MCP, prompt and context engineering, evals,
          and the rest of the modern AI dev stack.
        </p>
      </header>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1.5 rounded-md text-[12px] uppercase tracking-wider font-medium transition-colors ${
              category === c.value
                ? "bg-ink text-paper"
                : "bg-surface text-ink-soft border border-line hover:border-ink/30 hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface border border-line rounded-lg animate-pulse" />
          ))}
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-20">
          <p className="display text-[28px] text-ink-soft mb-1">No guides yet.</p>
          <p className="text-[13.5px] text-ink-muted">Guides will appear here as they're published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/knowledge/${guide.slug}`}
              className="group block bg-surface rounded-lg border border-line p-5 hover:border-ink/30 hover:shadow-card transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="display text-[20px] text-ink group-hover:text-accent transition-colors leading-tight">
                  {guide.title}
                </h3>
                <span className="text-2xl shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">{guide.icon}</span>
              </div>
              <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wider mb-2">
                <span className={`font-medium ${difficultyColor[guide.difficulty] || "text-ink-muted"}`}>
                  {guide.difficulty}
                </span>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-muted">{guide.category}</span>
              </div>
              {guide.tags && (
                <div className="flex gap-1.5 flex-wrap">
                  {(Array.isArray(guide.tags) ? guide.tags : String(guide.tags).split(/\s+/)).filter(Boolean).slice(0, 4).map((tag, i) => (
                    <span key={i} className="text-[10px] font-mono text-ink-faint">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function GuideDetail({ slug }: { slug: string }) {
  const [guide, setGuide] = useState<KnowledgeGuide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getKnowledgeGuide(slug).then(setGuide).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!guide) return;
    setPageMeta({
      title: `${guide.title} — DevPulse Knowledge`,
      description: `${guide.title} — a ${guide.difficulty} guide on ${guide.category} from DevPulse Knowledge.`,
      url: `https://devpulse.tatsatpandey.com/knowledge/${guide.slug}`,
    });
  }, [guide]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-line rounded w-64 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-line/50 rounded" style={{ width: `${80 - i * 5}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="text-center py-20">
        <p className="display text-[28px] text-ink-soft mb-1">Guide not found.</p>
        <Link to="/knowledge" className="text-accent text-[13px] hover:underline mt-2 inline-block">
          ← Back to Knowledge
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/knowledge" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink transition-colors mb-4">
        ← Knowledge
      </Link>
      <header className="mb-8 pb-5 border-b border-line">
        <div className="eyebrow mb-2 flex items-center gap-2">
          <span>{guide.category}</span>
          <span className="text-ink-faint">·</span>
          <span className="normal-case tracking-normal text-ink-muted">{guide.difficulty}</span>
        </div>
        <h1 className="display text-[24px] sm:text-[30px] md:text-[36px] text-ink">{guide.title}</h1>
      </header>

      <div className="prose prose-sm max-w-none prose-headings:font-medium prose-headings:text-ink prose-p:text-ink-soft prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-code:text-ink prose-code:bg-paper prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <MarkdownContent content={guide.content || ""} />
      </div>
    </div>
  );
}

/** Simple markdown-to-HTML renderer for guide content */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: ReactElement[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-ink text-paper rounded-md p-3 sm:p-4 text-[12px] sm:text-[12.5px] leading-relaxed overflow-x-auto mb-4 font-mono">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="display text-[18px] text-ink mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="display text-[24px] text-ink mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("| ")) {
      const tableLines = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      elements.push(<MarkdownTable key={i} lines={tableLines} />);
      i = j - 1;
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-4 text-ink-soft text-[13.5px] list-disc mb-1 leading-relaxed marker:text-ink-faint">
          <InlineMarkdown text={line.slice(2)} />
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={i} className="ml-4 text-ink-soft text-[13.5px] list-decimal mb-1 leading-relaxed marker:text-ink-faint">
          <InlineMarkdown text={line.replace(/^\d+\.\s/, "")} />
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-ink-soft text-[13.5px] leading-relaxed mb-2">
          <InlineMarkdown text={line} />
        </p>
      );
    }
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-ink font-medium">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="bg-paper px-1.5 py-0.5 rounded text-[12px] font-mono text-ink border border-line">{part.slice(1, -1)}</code>;
        }
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return <a key={i} href={linkMatch[2]} className="text-accent hover:underline decoration-accent/40" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;
  const headers = lines[0].split("|").filter(Boolean).map((h) => h.trim());
  const rows = lines.slice(2).map((line) => line.split("|").filter(Boolean).map((c) => c.trim()));

  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-[13px] border border-line rounded-md overflow-hidden">
        <thead className="bg-paper">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-[11px] uppercase tracking-wider font-medium text-ink-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-ink-soft text-[12.5px]">
                  <InlineMarkdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
