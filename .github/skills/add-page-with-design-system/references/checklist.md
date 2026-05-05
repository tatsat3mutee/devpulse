# Add Page with Design System — Checklist

## Page Component (`frontend/src/pages/{Name}Page.tsx`)

- [ ] Default export with `{Name}Page` naming convention
- [ ] Header section with `eyebrow` + `display` heading + `text-ink-muted` description
- [ ] `border-b border-line` divider below header
- [ ] Loading state with skeleton animation (`animate-pulse`)
- [ ] Uses `bg-paper` for page background (inherited from `App.tsx`)
- [ ] Uses `bg-surface border border-line rounded-lg` for cards
- [ ] Text sizes follow convention: headings `text-[15px]`, body `text-[13px]`

## Route (`frontend/src/App.tsx`)

- [ ] Page imported at the top of the file
- [ ] `<Route path="/slug" element={<NewPage />} />` added inside `<Routes>`
- [ ] Path uses kebab-case, no trailing slash

## Sidebar Navigation (`frontend/src/App.tsx`)

- [ ] Entry added to `navItems` array
- [ ] `to` matches the route `path`
- [ ] `icon` is a valid `IconName` from `Icon.tsx` (cast with `as const`)
- [ ] `label` is concise (1-2 words)
- [ ] Position in the array reflects navigation priority

## Design System Compliance

- [ ] No hardcoded colors — uses Tailwind token classes (`text-ink`, `bg-surface`, etc.)
- [ ] Works in both light and dark mode (test by toggling)
- [ ] Responsive: uses `sm:` and `lg:` breakpoints where needed
- [ ] Cards use `var(--shadow-card)` for shadows
- [ ] Interactive elements have hover states
- [ ] Font sizes use bracket notation: `text-[13px]`, `text-[15px]`
