import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown renderer for concept `mechanism` text.
 *
 * Supports exactly the subset the email renderer supports (paragraphs,
 * **bold**, *italic*, `code`) so the two surfaces can never disagree about how
 * a concept reads. If you extend one, extend the other — see
 * `backend/src/concepts/render.ts`.
 *
 * Returns React nodes rather than an HTML string: concept text is LLM-generated
 * from web content, so it never touches `dangerouslySetInnerHTML`.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className="font-mono text-[0.9em] bg-surface border border-line rounded px-1 py-0.5 text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/**
 * Single-paragraph fields (`why_it_matters`, `transfer`) still contain inline
 * markup, so rendering them as plain text leaks literal asterisks into the UI.
 * This applies the same inline rules without wrapping in a block.
 */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(text, "inline")}</>;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p key={i} className="text-[15px] leading-[1.75] text-ink-soft mb-4 last:mb-0">
          {para.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {renderInline(line, `${i}-${j}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
