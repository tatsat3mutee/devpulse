import type { Edition, ServedConcept } from "./serve.js";

/**
 * Email rendering for an edition.
 *
 * The web view and this renderer consume the *same* `Edition` object returned by
 * `serve.ts`, so the content cannot drift — only the presentation differs, which
 * it must (email clients have no CSS variables, no dark-mode tokens, and no JS).
 * If you add a field to a concept, add it in both places or in neither.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Inline markup only — **bold**, *italic*, `code`. Mirrors `InlineMarkdown` in
 * `frontend/src/lib/markdown.tsx`; single-paragraph fields such as
 * `why_it_matters` need this or their asterisks render literally.
 */
export function inlineMarkdownToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(
      /`([^`]+)`/g,
      '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:13px;">$1</code>'
    );
}

/**
 * Deliberately small markdown subset — paragraphs, **bold**, *italic* and
 * `code`. Concept mechanism text is written to this constraint; anything richer
 * would render inconsistently across mail clients anyway.
 */
export function markdownToEmailHtml(md: string): string {
  return md
    .split(/\n{2,}/)
    .map((para) => {
      const html = inlineMarkdownToHtml(para.trim()).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${html}</p>`;
    })
    .join("");
}

function mentionRow(c: ServedConcept, appUrl: string): string {
  return `
  <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
    <a href="${appUrl}/concept/${encodeURIComponent(c.slug)}"
       style="font-size:14px;font-weight:600;color:#0f172a;text-decoration:none;">${escapeHtml(c.title)}</a>
    <p style="margin:3px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${escapeHtml(c.hook)}</p>
  </td></tr>`;
}

export function renderEditionEmail(edition: Edition, appUrl: string): string {
  const lead = edition.lead;
  if (!lead) return "";

  const number = lead.claim_number
    ? `<p style="margin:0 0 18px;font-size:13px;font-weight:600;color:#0f766e;letter-spacing:0.02em;">${escapeHtml(lead.claim_number)}</p>`
    : "";

  const transfer = lead.transfer
    ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569;"><strong>Where else this shows up:</strong> ${inlineMarkdownToHtml(lead.transfer)}</p>`
    : "";

  const post = lead.post_draft
    ? `<div style="margin-top:28px;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
         <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">If you want to post it</p>
         <p style="margin:0;font-size:14px;line-height:1.65;color:#334155;white-space:pre-wrap;">${escapeHtml(lead.post_draft)}</p>
       </div>`
    : "";

  const mentions = edition.mentions.length
    ? `<div style="margin-top:32px;">
         <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Also worth knowing</p>
         <table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody>
           ${edition.mentions.map((m) => mentionRow(m, appUrl)).join("")}
         </tbody></table>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(lead.title)}</title></head>
<body style="background:#ffffff;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:36px 24px;">

    <p style="margin:0 0 26px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">
      DevPulse · ${escapeHtml(lead.area)}
    </p>

    <h1 style="margin:0 0 10px;font-size:26px;line-height:1.25;color:#0f172a;font-weight:700;">${escapeHtml(lead.title)}</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#475569;">${escapeHtml(lead.hook)}</p>
    ${number}

    ${markdownToEmailHtml(lead.mechanism)}

    <div style="margin:26px 0;padding:16px 18px;background:#f0fdfa;border-left:3px solid #0f766e;border-radius:0 6px 6px 0;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#0f766e;">Why this matters</p>
      <p style="margin:0;font-size:15px;line-height:1.65;color:#334155;">${inlineMarkdownToHtml(lead.why_it_matters)}</p>
    </div>

    ${transfer}
    ${post}
    ${mentions}

    <div style="margin-top:36px;padding-top:22px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 10px;font-size:13px;">
        <a href="${appUrl}/" style="color:#0f766e;text-decoration:none;font-weight:600;">Mark it read on DevPulse →</a>
      </p>
      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
        You get one concept twice a week. Nothing else.<br/>
        <a href="${appUrl}/unsubscribe" style="color:#94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body></html>`;
}

export function editionSubject(edition: Edition): string {
  return edition.lead?.title ?? "Your DevPulse concept";
}
