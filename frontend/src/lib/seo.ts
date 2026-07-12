// ── Page meta helpers (SEO / social) ─────────────────────────────────
// Dependency-free: directly upserts <meta> tags in document.head.

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function setPageMeta(opts: { title?: string; description?: string; url?: string }) {
  const { title, description, url } = opts;

  if (title) {
    document.title = title;
    upsertMeta("property", "og:title", title);
    upsertMeta("name", "twitter:title", title);
  }
  if (description) {
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:description", description);
    upsertMeta("name", "twitter:description", description);
  }
  if (url) {
    upsertMeta("property", "og:url", url);
  }
}
