---
name: add-icon-to-design-system
description: 'Add a new SVG icon to the DevPulse Icon component. Extends the IconName union type, adds a switch case with Lucide-style SVG paths, follows 24x24 viewBox and 1.75 stroke conventions. Use when: adding an icon, extending the icon set, adding a new icon to Icon.tsx, creating a custom icon.'
---

# Add Icon to Design System

Add a new SVG icon to the `Icon` component in `frontend/src/components/Icon.tsx`.

## When to Use This Skill

- Adding a new icon to the icon set
- A page or feature needs an icon not in the current catalog
- Extending the `IconName` type with a new option

## Quick Start

1. Add the icon name to the `IconName` union type
2. Add a `case` in the `switch` statement with SVG paths
3. Follow Lucide conventions: 24×24 viewBox, 1.75 stroke, round caps & joins

## Step-by-Step Procedure

### Step 1 — Choose the Icon Name

Use kebab-case, descriptive names. Check the existing catalog to avoid duplicates.

**Current icons (30):** `home`, `layers`, `rss`, `wrench`, `play`, `book`, `target`, `link`, `search`, `settings`, `menu`, `close`, `refresh`, `bookmark`, `bookmark-filled`, `arrow-right`, `arrow-left`, `external`, `spark`, `clock`, `trending`, `star`, `github`, `youtube`, `doc`, `chat`, `newspaper`, `code`, `sun`, `moon`

### Step 2 — Extend the IconName Type

Add the new name to the `IconName` union at the top of `Icon.tsx`:

```typescript
type IconName =
  | "home"
  // ... existing entries ...
  | "moon"
  | "new-icon";  // ← add here
```

### Step 3 — Add the Switch Case

Use the [icon case skeleton](./templates/icon-case-skeleton.tsx) as a starting point.

Add a new `case` inside the `switch (name)` block, before the default:

```tsx
case "new-icon":
  return (
    <svg {...common}>
      <path d="M..." />
    </svg>
  );
```

### Step 4 — SVG Path Guidelines

See [icon guidelines](./guidelines/icon-guidelines.md) for detailed conventions.

Key rules:
- **ViewBox**: Always `0 0 24 24` (the `common` object handles this)
- **Stroke**: 1.75 width, round linecap & linejoin (inherited from `common`)
- **Fill**: `none` by default (inherited from `common`). Override only for filled variants.
- **Path data**: Use Lucide-compatible paths. Get paths from [lucide.dev](https://lucide.dev) or draw them in a 24×24 grid.
- **Elements**: Use `<path>`, `<circle>`, `<rect>`, `<polygon>`, `<line>` as appropriate.
- **Spread `{...common}`**: Always spread the `common` object on the `<svg>` element.

## Icon Component Reference

See [full icon component reference](./references/icon-component.md).

## Guidelines

See [icon guidelines](./guidelines/icon-guidelines.md) for SVG conventions and best practices.
