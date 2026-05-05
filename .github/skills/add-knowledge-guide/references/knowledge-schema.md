# Knowledge Guides Schema Reference

Source: `sql/006_portal_upgrade.sql` (table creation), `sql/008_content_expansion.sql` (example guides)

## Table Definition

```sql
CREATE TABLE IF NOT EXISTS knowledge_guides (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL,           -- 'vscode', 'copilot', 'mcp', 'ai-tools', 'cloud'
  content       TEXT NOT NULL,           -- Markdown content (E-string escaped)
  icon          TEXT DEFAULT '📖',       -- Single emoji
  difficulty    TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  tags          TEXT[] DEFAULT '{}',
  is_published  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

## Valid Categories

| Category | Description | Example Guides |
|----------|-------------|---------------|
| `vscode` | VS Code features, extensions, tips | VS Code Productivity |
| `copilot` | GitHub Copilot usage and customization | Awesome Copilot guide |
| `mcp` | Model Context Protocol | MCP servers guide |
| `ai-tools` | AI/ML tools and techniques | Claude Code, Fine-Tuning, RAG |
| `cloud` | Cloud AI platforms | Azure AI Services |

## Difficulty Levels

| Level | Target Audience |
|-------|----------------|
| `beginner` | New to the topic; step-by-step instructions |
| `intermediate` | Familiar with basics; patterns and best practices |
| `advanced` | Expert-level; architecture decisions, optimization |

## Existing Guides (for reference)

Guides seeded in migrations 006 and 008:
1. Getting Started with GitHub Copilot (`copilot`, beginner)
2. MCP Servers Guide (`mcp`, intermediate)
3. VS Code Productivity (`vscode`, beginner)
4. Prompt Engineering Patterns (`ai-tools`, intermediate)
5. AI Landscape Map (`ai-tools`, beginner)
6. Claude Code — Terminal AI Assistant (`ai-tools`, intermediate)
7. LLM Fine-Tuning (`ai-tools`, advanced)
8. RAG & Vectorless RAG (`ai-tools`, intermediate)
9. Awesome Copilot — Skills, Agents & Plugins (`copilot`, intermediate)
10. Azure AI Services for Developers (`cloud`, intermediate)

## Frontend Integration

- **List endpoint**: `GET /api/knowledge?category=ai-tools`
- **Detail endpoint**: `GET /api/knowledge/:slug`
- **Frontend page**: `KnowledgePage.tsx` — shows guide cards grouped by category
- **API types**: `KnowledgeGuide` interface in `frontend/src/lib/api.ts`

```typescript
export interface KnowledgeGuide {
  id: number;
  title: string;
  slug: string;
  category: string;
  content?: string;  // Only on detail endpoint
  icon: string;
  difficulty: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}
```
