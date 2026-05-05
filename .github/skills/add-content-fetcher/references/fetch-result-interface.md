# FetchResult Interface Reference

Source: `backend/src/fetchers/types.ts`

```typescript
export interface FetchResult {
  title: string;          // Display title of the content item
  description: string;    // Summary/body text, truncated to ~500 chars
  url: string;            // Direct link to the original content (used for dedup via UNIQUE constraint)
  type: "paper" | "repo" | "social" | "news" | "video" | "article";
  platform: string;       // Display name: "arXiv", "GitHub", "Reddit", "Hacker News", etc.
  tags: string[];         // Freeform tags, e.g. ["cs.AI", "cs.CL"] or ["python", "llm"]
  publishedAt: Date;      // When the original content was published (used for recency gate)
  metadata?: Record<string, unknown>;  // Platform-specific data (stars, upvotes, citations, pdfUrl)
  imageUrl?: string;      // Thumbnail or preview image URL
  author?: string;        // Author name or username
  duration?: string;      // For videos: "PT12M34S" or "12:34"
}

export type FetcherFn = (sourceUrl: string) => Promise<FetchResult[]>;
```

## Field Conventions

| Field | Convention |
|-------|-----------|
| `title` | Cleaned of excess whitespace (`.replace(/\s+/g, " ")`) |
| `description` | Max 500 chars, no HTML tags |
| `url` | Must be absolute URL; used as dedup key (UNIQUE constraint on `items.url`) |
| `type` | Choose the closest match; `"article"` for blog posts, `"social"` for forum/social posts |
| `platform` | PascalCase or brand name: `"Hacker News"`, `"Hugging Face"`, `"arXiv"` |
| `tags` | Lowercase preferred; pulled from API categories or computed |
| `publishedAt` | Must be a valid `Date` object; items older than 7 days are typically filtered |
| `metadata` | Arbitrary JSON stored in `items.metadata JSONB` column; keep flat |
| `imageUrl` | Used by `VideoCard` component; omit if not available |
| `author` | Single string; for multiple authors use first or comma-separated |
| `duration` | ISO 8601 duration or `"MM:SS"` format |

## Existing Platform Names (for reference)

`"arXiv"`, `"GitHub"`, `"Reddit"`, `"Hacker News"`, `"Hugging Face"`, `"X"`, `"LinkedIn"`, `"YouTube"`, `"VS Code"`, `"OpenAI"`, `"Anthropic"`, `"Google"`, `"Microsoft"`, `"TechCrunch"`, `"The Verge"`, `"GNews"`
