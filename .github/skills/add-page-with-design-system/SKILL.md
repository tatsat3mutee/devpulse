---
name: add-page-with-design-system
description: 'Create a new frontend page following the DevPulse design system. Scaffolds a React page in pages/, adds a route in App.tsx, adds a sidebar NavLink with an icon. Use when: adding a new page, creating a new view, adding navigation, building a new section.'
---

# Add Page with Design System

Scaffold a new frontend page that follows DevPulse design tokens, typography conventions, and navigation patterns.

## When to Use This Skill

- Adding a new page/view to the frontend
- Creating a new sidebar navigation item
- Building a new section following the design system

## Quick Start

1. Create the page component in `frontend/src/pages/{Name}Page.tsx`
2. Add a route in `frontend/src/App.tsx`
3. Add a sidebar `NavLink` entry in the `navItems` array

## Step-by-Step Procedure

### Step 1 — Create the Page Component

Use the [page skeleton template](./templates/page-skeleton.tsx).

Every page follows this structure:
- `eyebrow` — uppercase label above the heading
- `display` heading — Instrument Serif font, 32-38px
- Subtitle in `text-ink-muted`
- Loading state with skeleton placeholder
- Content area

```tsx
export default function NewPage() {
  return (
    <div>
      <header className="mb-8 pb-4 border-b border-line">
        <div className="eyebrow mb-2">Section Label</div>
        <h1 className="display text-[32px] sm:text-[38px] text-ink mb-2">Page Title</h1>
        <p className="text-ink-muted text-[14px] max-w-xl">Description text.</p>
      </header>
      {/* Page content */}
    </div>
  );
}
```

### Step 2 — Add the Route

In `frontend/src/App.tsx`:

1. Import the page:
   ```tsx
   import NewPage from "./pages/NewPage";
   ```

2. Add a `<Route>` inside `<Routes>`:
   ```tsx
   <Route path="/new-path" element={<NewPage />} />
   ```

### Step 3 — Add Sidebar Navigation

In the `navItems` array at the top of `App.tsx`:

```tsx
{ to: "/new-path", label: "Label", icon: "icon-name" as const },
```

Choose an icon from the [IconName catalog](./references/design-tokens.md#icon-catalog).

### Step 4 — Apply Design Tokens

Use the Tailwind color utilities mapped from CSS custom properties:

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| Paper | `bg-paper` | Page background |
| Surface | `bg-surface` | Cards, sidebar |
| Ink | `text-ink` | Primary text, headings |
| Ink Soft | `text-ink-soft` | Secondary text |
| Ink Muted | `text-ink-muted` | Descriptions, subtitles |
| Ink Faint | `text-ink-faint` | Eyebrow labels |
| Line | `border-line` | Dividers, card borders |
| Accent | `text-accent`, `bg-accent` | Links, active states, badges |
| Accent Soft | `bg-accent-soft` | Accent backgrounds |

See [full design token reference](./references/design-tokens.md).

## Typography Classes

- `.eyebrow` — `text-[11px] uppercase tracking-[0.14em] font-medium` in `ink-faint`
- `.display` — `Instrument Serif, 400 weight` with tight letter-spacing

## Card Pattern

```tsx
<div className="bg-surface border border-line rounded-lg p-5"
     style={{ boxShadow: 'var(--shadow-card)' }}>
  {/* Card content */}
</div>
```

## Checklist

See [full checklist](./references/checklist.md).
