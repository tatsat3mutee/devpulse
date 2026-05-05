# DevPulse Design Tokens Reference

## CSS Custom Properties

Source: `frontend/src/index.css`

### Light Mode (`:root`)

| Property | RGB Value | Usage |
|----------|-----------|-------|
| `--paper` | `250 250 247` | Page background |
| `--surface` | `255 255 255` | Cards, sidebar, modals |
| `--ink` | `11 15 13` | Primary text, headings |
| `--ink-soft` | `58 63 60` | Secondary text, nav items |
| `--ink-muted` | `107 113 110` | Descriptions, subtitles |
| `--ink-faint` | `168 172 169` | Eyebrow labels, placeholders |
| `--line` | `231 229 223` | Borders, dividers |
| `--accent` | `14 124 90` | Links, active badges, CTAs |
| `--accent-soft` | `230 244 238` | Accent background tint |
| `--accent-ring` | `16 185 129` | Focus rings |

### Dark Mode (`.dark`)

| Property | RGB Value |
|----------|-----------|
| `--paper` | `13 16 14` |
| `--surface` | `21 26 23` |
| `--ink` | `228 232 229` |
| `--ink-soft` | `176 183 178` |
| `--ink-muted` | `120 128 123` |
| `--ink-faint` | `68 76 71` |
| `--line` | `38 44 40` |
| `--accent` | `52 211 153` |
| `--accent-soft` | `16 50 34` |

### Shadows

```css
--shadow-card: 0 1px 0 rgba(11,15,13,0.04), 0 1px 2px rgba(11,15,13,0.04);
--shadow-card-hover: 0 1px 0 rgba(11,15,13,0.06), 0 4px 16px -4px rgba(11,15,13,0.10);
```

## Tailwind Class Mapping

Defined in `tailwind.config.js`:

| Tailwind Class | CSS Property |
|---------------|-------------|
| `bg-paper` | `--paper` |
| `bg-surface` | `--surface` |
| `text-ink` | `--ink` |
| `text-ink-soft` | `--ink-soft` |
| `text-ink-muted` | `--ink-muted` |
| `text-ink-faint` | `--ink-faint` |
| `border-line` | `--line` |
| `text-accent` / `bg-accent` | `--accent` |
| `bg-accent-soft` | `--accent-soft` |
| `ring-accent-ring` | `--accent-ring` |

All colors use `rgb(var(--name))` syntax for opacity modifier support (e.g. `bg-ink/30`).

## Typography

| Class | Font | Weight | Features |
|-------|------|--------|----------|
| Body | Inter | 400 | `cv11`, `ss01`, `ss03` |
| `.display` | Instrument Serif | 400 | Tight letter-spacing |
| `.eyebrow` | Inter | 500 | `11px`, uppercase, `tracking-[0.14em]`, `ink-faint` |
| Headings | Inter | — | `letter-spacing: -0.005em` |

## Icon Catalog

Component: `frontend/src/components/Icon.tsx`

Available `IconName` values:

`home`, `layers`, `rss`, `wrench`, `play`, `book`, `target`, `link`, `search`, `settings`, `menu`, `close`, `refresh`, `bookmark`, `bookmark-filled`, `arrow-right`, `arrow-left`, `external`, `spark`, `clock`, `trending`, `star`, `github`, `youtube`, `doc`, `chat`, `newspaper`, `code`, `sun`, `moon`

Usage:
```tsx
import Icon from "../components/Icon";
<Icon name="home" size={16} className="text-ink-muted" />
```

Props: `name: IconName`, `size?: number` (default 16), plus any `SVGProps<SVGSVGElement>`.

## Navigation Pattern

Sidebar uses `navItems` array in `App.tsx`:

```tsx
const navItems = [
  { to: "/path", label: "Label", icon: "icon-name" as const },
];
```

Each renders as a `<NavLink>` with active/inactive styles:
- **Active**: `bg-ink text-paper`
- **Inactive**: `text-ink-soft hover:bg-paper hover:text-ink`

## Card Pattern

```tsx
<div className="bg-surface border border-line rounded-lg p-5"
     style={{ boxShadow: 'var(--shadow-card)' }}>
```

Hover variant (add to interactive cards):
```tsx
className="... transition-shadow hover:shadow-[var(--shadow-card-hover)]"
```
