# Icon Component Reference

Source: `frontend/src/components/Icon.tsx`

## Component Signature

```typescript
import { SVGProps } from "react";

type IconName =
  | "home" | "layers" | "rss" | "wrench" | "play" | "book"
  | "target" | "link" | "search" | "settings" | "menu" | "close"
  | "refresh" | "bookmark" | "bookmark-filled" | "arrow-right"
  | "arrow-left" | "external" | "spark" | "clock" | "trending"
  | "star" | "github" | "youtube" | "doc" | "chat" | "newspaper"
  | "code" | "sun" | "moon";

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;  // default: 16
}

export default function Icon({ name, size = 16, className = "", ...rest }: Props) { ... }
```

## Common Object

Applied to every `<svg>` element via spread:

```typescript
const common = {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className,
  "aria-hidden": true,
  ...rest,
};
```

## Usage Examples

```tsx
import Icon from "../components/Icon";

// Basic usage
<Icon name="home" size={16} />

// With color
<Icon name="search" size={20} className="text-ink-muted" />

// In a button
<button className="flex items-center gap-2">
  <Icon name="refresh" size={14} />
  Refresh
</button>

// In sidebar nav (from App.tsx)
<Icon name={n.icon} size={15} />
```

## Where Icons Are Used

- **Sidebar navigation**: `App.tsx` `navItems` array — each item has an `icon` field
- **Feed items**: `FeedItem.tsx` — external link, bookmark, clock icons
- **Video cards**: `VideoCard.tsx` — play, clock icons
- **Page headers**: Various pages use icons in buttons and UI elements
- **Theme toggle**: `sun` / `moon` icons in the sidebar footer
