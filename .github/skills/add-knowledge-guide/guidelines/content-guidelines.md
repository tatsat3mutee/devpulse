# Knowledge Guide Content Guidelines

## E-String Escaping Rules

Knowledge guide content is stored as a PostgreSQL E-string (`E'...'`). Follow these rules:

### Newlines
Use `\n` for line breaks:
```sql
E'# Title\n\nFirst paragraph.\n\n## Section\n\nContent here.'
```

### Single Quotes
Escape with double single-quote (`''`):
```sql
E'It''s important to note that Anthropic''s Claude...'
```

### Backslashes
Escape with double backslash (`\\`):
```sql
E'Use \\n for newlines in code examples'
```

### Backticks in Code Blocks
Backticks do NOT need escaping in E-strings:
```sql
E'```python\nprint("hello")\n```'
```

### Double Quotes
Do NOT need escaping:
```sql
E'He said "hello" to the audience'
```

## Markdown Structure Conventions

Every guide should follow this structure:

```markdown
# Guide Title

Introduction paragraph (2-3 sentences). What is this about and why does it matter.

## Getting Started / Overview

Core content. Setup steps or key concepts.

## Key Section 1

### Subsection (if needed)

Content with code examples, tables, or lists.

## Key Section 2

More content...

## Best Practices

1. **Bold practice name** — explanation
2. **Bold practice name** — explanation
3. **Bold practice name** — explanation
4. **Bold practice name** — explanation
5. **Bold practice name** — explanation
```

## Content Quality Standards

### Length
- **Minimum**: 500 words (enough to be useful)
- **Maximum**: 2000 words (keep scannable)
- **Target**: 800-1200 words

### Code Examples
- Always include language tag: ` ```python `, ` ```typescript `, ` ```bash `
- Show practical, runnable examples
- Keep examples concise (5-15 lines)

### Tables
Use tables for comparisons and reference:
```markdown
| Tool | Purpose |
|------|---------|
| Name | What it does |
```

### Lists
- Use numbered lists for sequential steps
- Use bullet lists for non-ordered items
- Bold the key term in best-practice lists

## Tag Conventions

Tags should be:
- Lowercase
- Hyphenated for multi-word: `fine-tuning`, `prompt-engineering`
- 3-6 tags per guide
- Include the technology name and category terms
- Example: `ARRAY['copilot', 'skills', 'agents', 'plugins', 'awesome-copilot']`

## Icon Selection

Use a single emoji that represents the guide topic:

| Category | Suggested Icons |
|----------|----------------|
| `vscode` | ⚡, 🔧, 📝, 🎨 |
| `copilot` | 🤖, 🧩, ✨, 🚀 |
| `mcp` | 🔌, 🛠️, 🔗, ⚙️ |
| `ai-tools` | 🧬, 🎯, 🔍, 📊, 🧠 |
| `cloud` | ☁️, 🌐, 🏗️, 📡 |

## Slug Conventions

- Kebab-case: `getting-started-copilot`
- Descriptive but concise: 2-5 words
- Include the primary topic: `rag-guide`, `claude-code-guide`
- Must be unique across all guides
