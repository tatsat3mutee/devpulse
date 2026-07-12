import { useState, useRef, useEffect } from "react";
import { api, type ChatMessage } from "../lib/api";

/* ── Helpers ────────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Safe markdown renderer: HTML-escape first, then apply transforms
function renderMarkdown(raw: string): string {
  const text = escapeHtml(raw);
  return (
    text
      // Fenced code blocks
      .replace(
        /```(?:\w*)\n([\s\S]*?)```/g,
        '<pre class="bg-surface border border-line rounded p-2 my-2 overflow-x-auto text-[12px] font-mono"><code>$1</code></pre>'
      )
      // Inline code
      .replace(
        /`([^`\n]+)`/g,
        '<code class="bg-surface px-1 py-0.5 rounded text-[12px] font-mono">$1</code>'
      )
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // External links
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>'
      )
      // Internal links
      .replace(
        /\[([^\]]+)\]\((\/[^)]+)\)/g,
        '<a href="$2" class="text-accent hover:underline">$1</a>'
      )
      // Citation refs [1], [2] → superscript
      .replace(/\[(\d+)\]/g, '<sup class="text-accent font-medium text-[10px]">[$1]</sup>')
      // Newlines
      .replace(/\n/g, "<br/>")
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ── Suggested questions ────────────────────────────────────── */

const SUGGESTIONS = [
  "What is RAG and how does it work?",
  "Compare GPT-4o vs Claude Sonnet",
  "How do I fine-tune Llama 3?",
  "Best MCP servers for VS Code",
  "What is context engineering?",
  "How to get started with agent mode?",
];

/* ── Component ──────────────────────────────────────────────── */

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: msg };
    const history = messages;
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.sendChat(msg, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, citations: res.citations },
      ]);
    } catch (err: any) {
      const errMsg = err?.message?.includes("503")
        ? "No AI key configured - add OPENROUTER_API_KEY or GROQ_API_KEY to backend/.env"
        : err?.message?.includes("429")
        ? "Rate limited - wait a moment and try again."
        : "Something went wrong. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "calc(100vh - 3.5rem - 80px)" }}>
      {/* ── Empty state ─────────────────────────────────────── */}
      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          <div className="text-[28px] mb-3 select-none">✦</div>
          <h1 className="display text-[28px] sm:text-[34px] text-ink text-center mb-2">
            DevPulse AI
          </h1>
          <p className="text-ink-muted text-[13.5px] text-center mb-8 max-w-sm">
            Ask anything about AI tools, models, research, and developer workflows.
            Answers are grounded in the DevPulse feed.
          </p>

          {/* Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mb-10">
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-left px-3.5 py-2.5 rounded-lg bg-surface border border-line text-[12.5px] text-ink-soft hover:text-ink hover:border-ink/25 hover:bg-paper transition-all"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <InputBar
            input={input}
            setInput={setInput}
            onSend={() => send()}
            loading={loading}
          />
          {error && <p className="mt-3 text-[11px] text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* ── Conversation ────────────────────────────────────── */}
      {!isEmpty && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-8">
            {messages.map((m, i) => (
              <MessageRow key={i} message={m} />
            ))}
            {loading && <ThinkingRow />}
          </div>

          {error && (
            <p className="px-4 pb-1 text-[11px] text-red-500">{error}</p>
          )}

          {/* Sticky input at bottom */}
          <div className="sticky bottom-0 bg-paper/90 backdrop-blur border-t border-line py-4">
            <div className="max-w-3xl mx-auto px-4">
              <InputBar
                input={input}
                setInput={setInput}
                onSend={() => send()}
                loading={loading}
                onKey={handleKey}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Message row ────────────────────────────────────────────── */

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-ink text-paper rounded-2xl rounded-br-sm px-4 py-2.5 text-[13.5px] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  const hasCitations = message.citations && message.citations.length > 0;

  return (
    <div className="space-y-3">
      {/* Answer */}
      <div className="flex gap-3 items-start">
        <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-paper text-[11px] select-none">✦</span>
        </div>
        <div
          className="prose-chat text-[13.5px] leading-relaxed text-ink flex-1"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
      </div>

      {/* Citations */}
      {hasCitations && (
        <div className="ml-9">
          <p className="text-[10.5px] uppercase tracking-wider text-ink-faint font-mono mb-1.5">
            Sources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {message.citations!.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-line text-[11px] text-ink-soft hover:text-ink hover:border-ink/30 transition-colors"
              >
                <span className="text-ink-faint font-mono">{i + 1}</span>
                <span>{hostname(url)}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThinkingRow() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-paper text-[11px] select-none">✦</span>
      </div>
      <div className="bg-surface border border-line rounded-xl px-3.5 py-2.5">
        <div className="flex gap-1.5 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-faint animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-faint animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-faint animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Input bar ──────────────────────────────────────────────── */

interface InputBarProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  onKey?: (e: React.KeyboardEvent) => void;
}

function InputBar({ input, setInput, onSend, loading, onKey }: InputBarProps) {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
    onKey?.(e);
  };

  return (
    <div className="flex items-end gap-2 bg-surface border border-line rounded-xl px-4 py-3 focus-within:border-ink/30 transition-colors w-full max-w-3xl mx-auto">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask about AI tools, models, coding..."
        maxLength={2000}
        rows={1}
        disabled={loading}
        className="flex-1 bg-transparent text-ink text-[13.5px] placeholder:text-ink-faint outline-none resize-none leading-relaxed"
        style={{ maxHeight: 120 }}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 120) + "px";
        }}
      />
      <button
        onClick={onSend}
        disabled={!input.trim() || loading}
        className="w-8 h-8 rounded-lg bg-ink text-paper flex items-center justify-center disabled:opacity-30 hover:bg-ink-soft transition-colors shrink-0"
        aria-label="Send"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
