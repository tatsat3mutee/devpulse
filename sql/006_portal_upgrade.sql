-- ============================================
-- 006: Portal Upgrade — new item types, columns, topics, sources
-- ============================================

-- 1. Add 'video' and 'article' to item types (using CHECK constraint if exists, else just allow any TEXT)
-- The existing type column is TEXT with no CHECK, so we just use new values freely.

-- 2. Add new columns to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS duration TEXT;  -- e.g. "PT12M34S" or "12:34"

-- 3. New topics for the portal
INSERT INTO topics (name, slug, category, category_color, description)
VALUES
  ('VS Code Updates', 'vscode-updates', 'Tool', '#007ACC', 'Latest Visual Studio Code releases, features, and extensions'),
  ('Copilot Updates', 'copilot-updates', 'Tool', '#6F42C1', 'GitHub Copilot changelog, new features, skills, agents, and MCP integrations'),
  ('AI Tutorials', 'ai-tutorials', 'Education', '#E97627', 'Video tutorials, courses, and educational content about AI/ML'),
  ('Copilot Skills & Agents', 'copilot-skills-agents', 'Tool', '#8957E5', 'Building custom Copilot skills, agents, MCP servers, and extensibility'),
  ('MCP Servers', 'mcp-servers', 'Tool', '#2EA44F', 'Model Context Protocol servers, tools, and integrations'),
  ('AI Tools Comparison', 'ai-tools-comparison', 'Analysis', '#DA3B01', 'Comparisons between AI coding assistants, LLMs, and dev tools'),
  ('AI Industry News', 'ai-industry-news', 'News', '#0078D4', 'Major AI industry announcements, funding, acquisitions, and policy'),
  ('AI Startups', 'ai-startups', 'News', '#FF6F00', 'New AI startups, products, and launches')
ON CONFLICT (slug) DO NOTHING;

-- 4. New sources

-- VS Code RSS feeds
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('VS Code Release Notes', 'VS Code', 'news', 'https://code.visualstudio.com/feed.xml', 'rss', true),
  ('VS Code Blog', 'VS Code', 'news', 'https://code.visualstudio.com/blogs/feed.xml', 'rss', true)
ON CONFLICT DO NOTHING;

-- Copilot / GitHub changelog
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('GitHub Copilot Changelog', 'GitHub', 'news', 'https://github.blog/changelog/label/copilot/feed/', 'rss', true),
  ('GitHub Blog - AI', 'GitHub', 'news', 'https://github.blog/category/ai-ml/feed/', 'rss', true)
ON CONFLICT DO NOTHING;

-- AI Company blogs (RSS)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('OpenAI Blog', 'OpenAI', 'news', 'https://openai.com/blog/rss.xml', 'rss', true),
  ('Anthropic News', 'Anthropic', 'news', 'https://www.anthropic.com/rss.xml', 'rss', true),
  ('Google AI Blog', 'Google', 'news', 'https://blog.google/technology/ai/rss/', 'rss', true),
  ('Microsoft AI Blog', 'Microsoft', 'news', 'https://blogs.microsoft.com/ai/feed/', 'rss', true),
  ('Meta AI Blog', 'Meta', 'news', 'https://ai.meta.com/blog/rss/', 'rss', true),
  ('NVIDIA AI Blog', 'NVIDIA', 'news', 'https://blogs.nvidia.com/feed/', 'rss', true)
ON CONFLICT DO NOTHING;

-- Tech news RSS
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('TechCrunch AI', 'TechCrunch', 'news', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'rss', true),
  ('The Verge AI', 'The Verge', 'news', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'rss', true),
  ('Ars Technica AI', 'Ars Technica', 'news', 'https://feeds.arstechnica.com/arstechnica/index', 'rss', true),
  ('VentureBeat AI', 'VentureBeat', 'news', 'https://venturebeat.com/category/ai/feed/', 'rss', true)
ON CONFLICT DO NOTHING;

-- YouTube channels (fetcher uses channel URL to search)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('Fireship', 'YouTube', 'education', 'UCsBjURrPoezykLs9EqgamOA', 'youtube', true),
  ('Two Minute Papers', 'YouTube', 'education', 'UCbfYPyITQ-7l4upoX8nvctg', 'youtube', true),
  ('Yannic Kilcher', 'YouTube', 'education', 'UCZHmQk67mSJgfCCTn7xBfew', 'youtube', true),
  ('Matt Wolfe', 'YouTube', 'education', 'UCJIfeSCssxSC_Dhc5s7woww', 'youtube', true),
  ('AI Explained', 'YouTube', 'education', 'UCNJ1Ymd5yFuUPtn21xtRbbw', 'youtube', true),
  ('NetworkChuck', 'YouTube', 'education', 'UC9x0AN7BWHpCDHSm9NiJFJQ', 'youtube', true),
  ('Sentdex', 'YouTube', 'education', 'UCfzlCWGWYyIQ0aLC5w48gBQ', 'youtube', true)
ON CONFLICT DO NOTHING;

-- GNews (general AI news via API)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('GNews - AI', 'GNews', 'news', 'artificial intelligence', 'gnews', true),
  ('GNews - Machine Learning', 'GNews', 'news', 'machine learning LLM', 'gnews', true)
ON CONFLICT DO NOTHING;

-- 5. Create knowledge_guides table for curated content
CREATE TABLE IF NOT EXISTS knowledge_guides (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL,           -- 'vscode', 'copilot', 'mcp', 'ai-tools'
  content       TEXT NOT NULL,           -- Markdown content
  icon          TEXT DEFAULT '📖',
  difficulty    TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  tags          TEXT[] DEFAULT '{}',
  is_published  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Seed initial knowledge guides
INSERT INTO knowledge_guides (title, slug, category, content, icon, difficulty, tags)
VALUES
(
  'Getting Started with GitHub Copilot',
  'getting-started-copilot',
  'copilot',
  '## Getting Started with GitHub Copilot

### What is GitHub Copilot?
GitHub Copilot is an AI pair programmer that helps you write code faster. It draws context from comments and code to suggest individual lines and whole functions instantly.

### Setup
1. Install the **GitHub Copilot** extension in VS Code
2. Sign in with your GitHub account
3. Start typing — Copilot suggests completions automatically

### Key Features
- **Inline suggestions**: Tab to accept, Esc to dismiss
- **Copilot Chat**: Ask questions, explain code, fix bugs (Ctrl+I)
- **Multi-file context**: Copilot reads open files for better suggestions
- **Terminal integration**: Ask Copilot to explain or generate terminal commands

### Tips
- Write clear comments before functions to guide suggestions
- Use `Ctrl+Enter` to see multiple suggestions
- Open related files to give Copilot more context
- Use `@workspace` in chat to reference your entire project',
  '🤖',
  'beginner',
  ARRAY['copilot', 'vscode', 'ai-coding']
),
(
  'Copilot Agent Mode & Custom Agents',
  'copilot-agent-mode',
  'copilot',
  '## Copilot Agent Mode & Custom Agents

### Agent Mode
Agent mode lets Copilot autonomously plan and execute multi-step coding tasks. It can:
- Edit multiple files across your project
- Run terminal commands
- Iterate on errors automatically
- Use tools and MCP servers

### How to Use
1. Open Copilot Chat (`Ctrl+Shift+I`)
2. Select **Agent** mode from the dropdown
3. Describe your task in natural language
4. Review and approve changes

### Custom Agents (.agent.md)
Create custom agent personas with specialized instructions:

```yaml
---
name: my-agent
description: Specialized for my project
tools:
  - codebase
  - terminal
---
You are an expert in React and TypeScript...
```

### Built-in Tools
- `codebase` — search and read files
- `terminal` — run commands
- `fetch` — make HTTP requests
- `browser` — interact with web pages',
  '🕵️',
  'intermediate',
  ARRAY['copilot', 'agents', 'vscode']
),
(
  'Model Context Protocol (MCP) Guide',
  'mcp-guide',
  'mcp',
  '## Model Context Protocol (MCP)

### What is MCP?
MCP is an open protocol that lets AI assistants connect to external tools and data sources. Think of it as a "USB-C for AI" — a standard way to plug in capabilities.

### Architecture
```
AI Assistant ←→ MCP Client ←→ MCP Server ←→ External Tool
```

### Setting Up MCP in VS Code
1. Create `.vscode/mcp.json` in your project
2. Define server configurations:

```json
{
  "servers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my-org/mcp-server"],
      "env": { "API_KEY": "${input:apiKey}" }
    }
  }
}
```

3. Copilot will discover tools from connected MCP servers
4. Use them via `@` mentions in chat or in agent mode

### Popular MCP Servers
- **GitHub** — issues, PRs, repos
- **PostgreSQL** — query databases
- **Filesystem** — read/write local files
- **Brave Search** — web search
- **Puppeteer** — browser automation',
  '🔌',
  'intermediate',
  ARRAY['mcp', 'copilot', 'tools']
),
(
  'VS Code Power User Tips',
  'vscode-power-tips',
  'vscode',
  '## VS Code Power User Tips

### Essential Shortcuts
| Action | Shortcut |
|--------|----------|
| Command Palette | `Ctrl+Shift+P` |
| Quick Open | `Ctrl+P` |
| Toggle Terminal | `` Ctrl+` `` |
| Multi-cursor | `Alt+Click` |
| Go to Definition | `F12` |
| Find in Files | `Ctrl+Shift+F` |
| Rename Symbol | `F2` |

### Must-Have Extensions for AI Developers
1. **GitHub Copilot** — AI code completion
2. **Python** — Python language support
3. **Jupyter** — Notebook support
4. **Remote - SSH** — Remote development
5. **Docker** — Container management
6. **GitLens** — Git supercharged

### Workspace Settings
Use `.vscode/settings.json` for project-specific config:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.exclude": { "**/node_modules": true }
}
```

### Profiles
Create different VS Code profiles for different workflows (Python ML, Web Dev, etc.)',
  '⚡',
  'beginner',
  ARRAY['vscode', 'productivity', 'tips']
),
(
  'Prompt Engineering for Developers',
  'prompt-engineering',
  'ai-tools',
  '## Prompt Engineering for Developers

### Core Principles
1. **Be specific**: "Write a TypeScript function that..." beats "Write some code"
2. **Provide context**: Share file structures, constraints, and examples
3. **Use system prompts**: Set the AI''s role and behavior upfront
4. **Iterate**: Refine prompts based on output quality

### Patterns That Work

#### Few-Shot Prompting
```
Convert these to TypeScript interfaces:
Input: { name: "Alice", age: 30 }
Output: interface User { name: string; age: number; }

Input: { title: "Hello", views: 100, draft: true }
Output:
```

#### Chain of Thought
```
Analyze this function step by step:
1. What does it do?
2. What are the edge cases?
3. How can it be improved?
```

#### Role-Based
```
You are a senior TypeScript developer who writes
clean, well-tested code with proper error handling.
```

### For Copilot Chat
- Use `@workspace` for project-wide context
- Use `/fix` to fix errors, `/explain` to understand code
- Use `#file:path` to reference specific files
- Write `.github/copilot-instructions.md` for project-level prompts',
  '✍️',
  'intermediate',
  ARRAY['prompts', 'ai-tools', 'copilot']
),
(
  'Building AI-Powered Apps with LLM APIs',
  'building-with-llm-apis',
  'ai-tools',
  '## Building AI-Powered Apps with LLM APIs

### Choosing an API
| Provider | Best For | Free Tier |
|----------|----------|-----------|
| OpenAI | GPT-4o, best overall | $5 credit |
| Anthropic | Claude, long context | $5 credit |
| Groq | Fast inference | Free tier |
| Google | Gemini, multimodal | Free tier |
| Together AI | Open source models | $5 credit |

### Basic Pattern (Node.js)
```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7
  })
});
```

### Best Practices
- Always set `temperature` (0 for factual, 0.7-1.0 for creative)
- Implement retry logic with exponential backoff
- Cache responses when possible
- Use streaming for better UX
- Set `max_tokens` to control costs
- Use cheaper models (gpt-4o-mini, haiku) for simple tasks',
  '🏗️',
  'intermediate',
  ARRAY['llm', 'api', 'development']
)
ON CONFLICT (slug) DO NOTHING;
