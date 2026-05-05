# Icon Guidelines

## SVG Conventions (Lucide Style)

The DevPulse Icon component follows [Lucide](https://lucide.dev) conventions:

### Grid & ViewBox
- **ViewBox**: `0 0 24 24` — all icons are designed in a 24×24 unit grid
- **Padding**: Keep a ~2px visual margin; most content fits within the 4–20 unit range
- **Optical size**: The `size` prop scales the icon (default 16px)

### Stroke Properties
- **Width**: `1.75` (slightly heavier than Lucide's default 2, for small sizes)
- **Linecap**: `round`
- **Linejoin**: `round`
- **Fill**: `none` (stroke-only by default)

### Filled Variants
For filled icons (e.g. `bookmark-filled`), override on the `<svg>`:
```tsx
<svg {...common} fill="currentColor" stroke="currentColor">
  <path d="..." />
</svg>
```

### Naming Conventions
- Use **kebab-case**: `arrow-right`, `bookmark-filled`
- Directional variants: `-left`, `-right`, `-up`, `-down`
- State variants: `-filled`, `-off`, `-outline`
- Avoid abbreviations: `document` not `doc` (exception: existing `doc` is grandfathered)

### Path Data Sources
1. **Lucide icons**: Copy SVG paths from [lucide.dev](https://lucide.dev). These are already 24×24 with compatible stroke settings.
2. **Heroicons**: [heroicons.com](https://heroicons.com) — use the "outline" variant, adjust stroke width.
3. **Custom**: Draw in a 24×24 grid. Use simple geometric shapes. Prefer `<path>` over individual `<line>` elements.

### SVG Elements to Use
| Element | When to Use |
|---------|-------------|
| `<path>` | Complex shapes, combined strokes (most common) |
| `<circle>` | Perfect circles: `cx`, `cy`, `r` |
| `<rect>` | Rectangles/squares: `x`, `y`, `width`, `height`, `rx` for rounding |
| `<polygon>` | Filled shapes defined by points (e.g. play triangle) |
| `<line>` | Simple straight lines (prefer path with `M...L...` instead) |

### Do's and Don'ts

**Do:**
- Keep icons simple and recognizable at 16px
- Use the `common` spread object on every `<svg>`
- Test at multiple sizes (14, 16, 20, 24)
- Ensure the icon works in both light and dark mode (uses `currentColor`)

**Don't:**
- Don't add `width`, `height`, or `viewBox` manually — they come from `common`
- Don't use inline `style` attributes
- Don't use `<g>` wrapper elements unless necessary for transforms
- Don't use `fill` colors other than `none` or `currentColor`
- Don't add `id` attributes (causes conflicts when multiple instances render)

### Testing
After adding an icon:
1. Verify it renders at the default `size={16}`
2. Check it at `size={24}` for larger contexts
3. Toggle dark mode to confirm it adapts
4. Use it in a `NavLink` to verify alignment with text
