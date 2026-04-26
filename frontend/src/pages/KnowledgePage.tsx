import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, KnowledgeGuide } from "../lib/api";

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
  ];

  const difficultyColor: Record<string, string> = {
    beginner: "bg-green-50 text-green-700",
    intermediate: "bg-yellow-50 text-yellow-700",
    advanced: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Knowledge Hub</h1>
        <p className="text-gray-400 text-sm">Curated guides for AI developers — Copilot, VS Code, MCP, and more</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === c.value
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span>{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Guide cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📖</p>
          <p className="text-lg mb-1">No guides yet</p>
          <p className="text-sm">Guides will appear here as they're published</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/knowledge/${guide.slug}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{guide.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors mb-1">
                    {guide.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColor[guide.difficulty] || "bg-gray-50 text-gray-600"}`}>
                      {guide.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs">
                      {guide.category}
                    </span>
                  </div>
                  {guide.tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {guide.tags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: `${80 - i * 5}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Guide not found</p>
        <Link to="/knowledge" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
          ← Back to Knowledge Hub
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/knowledge" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-block">
        ← Knowledge Hub
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{guide.icon}</span>
        <div>
          <h1 className="text-2xl font-bold">{guide.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
              {guide.difficulty}
            </span>
            <span className="text-xs text-gray-400">{guide.category}</span>
          </div>
        </div>
      </div>

      {/* Render markdown-like content */}
      <div className="prose prose-sm max-w-none">
        <MarkdownContent content={guide.content || ""} />
      </div>
    </div>
  );
}

/** Simple markdown-to-HTML renderer for guide content */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-4">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        codeLang = line.slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-semibold mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("| ")) {
      // Collect table
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
        <li key={i} className="ml-4 text-gray-600 text-sm list-disc mb-1">
          <InlineMarkdown text={line.slice(2)} />
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={i} className="ml-4 text-gray-600 text-sm list-decimal mb-1">
          <InlineMarkdown text={line.replace(/^\d+\.\s/, "")} />
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-gray-600 text-sm leading-relaxed mb-2">
          <InlineMarkdown text={line} />
        </p>
      );
    }
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  // Bold, inline code, links
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">{part.slice(1, -1)}</code>;
        }
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return <a key={i} href={linkMatch[2]} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>;
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
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-600 text-xs">
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
