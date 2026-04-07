# UbiVibe Frontend Design System

Every generated output MUST follow these tokens exactly. No improvisation.

## Color Palette

| Token | CSS Variable | Light Mode | Dark Mode |
|-------|-------------|------------|-----------|
| Background (Deep) | `var(--bg)` | `#ffffff` | `#0A0E17` |
| Text (Light) | `var(--text)` | `#111827` | `#E8ECF4` |
| Primary (Vibe Core) | `var(--primary)` | `#00E5A0` | `#00E5A0` |
| Surface | `var(--surface)` | `#f8fafc` | `#0F1420` |
| Border | `var(--border)` | `#e2e8f0` | `#1a2030` |
| Signal | `#00B4D8` | cyan highlights, active states |
| Autonomy | `#7B61FF` | violet accents, secondary actions |

- Default mode: **dark** unless user says "light"
- Brand color from TEAM CONTEXT overrides `--primary` only, never `--bg`
- Gradients on hero sections and primary CTAs: `linear-gradient(135deg, #00E5A0 0%, #00B4D8 50%, #7B61FF 100%)`

## Banned Classes

Never use: `bg-slate-900`, `bg-slate-950`, `bg-gray-900`, `bg-zinc-900`, `bg-zinc-950`, `bg-purple-600`, `bg-violet-600`, or any raw hex color in HTML attributes outside the UbiVibe palette.

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headings | Syne | 700–800 | H1-H6, stat numbers, nav brand |
| Body | Inter | 400 | Paragraphs, labels, inputs |
| Mono | System mono | 400 | Code blocks only |

### Type Scale

```
text-xs:   0.75rem / 1rem
text-sm:   0.875rem / 1.25rem
text-base: 1rem / 1.5rem
text-lg:   1.125rem / 1.75rem
text-xl:   1.25rem / 1.75rem
text-2xl:  1.5rem / 2rem
text-3xl:  1.875rem / 2.25rem
text-4xl:  2.25rem / 2.5rem
```

### Font Loading (required in `<head>`)

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Syne','system-ui']}}}}</script>
```

## Spacing

8px base grid. All spacing in multiples of `0.5rem`.

| Token | Value |
|-------|-------|
| xs | 0.25rem (4px) |
| sm | 0.5rem (8px) |
| md | 1rem (16px) |
| lg | 1.5rem (24px) |
| xl | 2rem (32px) |
| 2xl | 3rem (48px) |

## Border Radius

| Usage | Value |
|-------|-------|
| Default | 0.5rem |
| Cards | 0.75rem |
| Pills/Tags | 9999px |
| Inputs | 0.5rem |

## Components

### Buttons

```
Primary:   gradient bg, text-white, rounded-lg, px-6 py-3, font-semibold, hover:opacity-90
Secondary: transparent, border 1px var(--border), rounded-lg, px-6 py-3, hover:bg var(--surface)
Ghost:     transparent, rounded-lg, px-4 py-2, hover:bg var(--surface)
```

### Cards

```
bg: var(--surface), border: 1px solid var(--border), rounded-xl, p-6
hover: shadow-lg, transition 200ms ease
```

### Inputs

```
bg: var(--surface), border: 1px solid var(--border), rounded-lg, px-4 py-2
focus: ring-2 ring-[var(--primary)] outline-none
```

### Navbar

```
sticky top-0, z-50, backdrop-blur-md, bg opacity-80
border-bottom: 1px solid var(--border)
```

## Responsive Breakpoints

Mobile-first. Single breakpoint at `768px`.

| Breakpoint | Target |
|-----------|--------|
| Default | Mobile (<768px) |
| `min-width: 768px` | Tablet + Desktop |

- Cards: 1-col mobile, grid desktop
- Nav: CSS-only hamburger on mobile, horizontal on desktop
- Max content width: `1280px` centered

## Dashboard Layout

```
+--sidebar(240px)--+--main-content--+
|  Brand/Logo      |  Header bar    |
|  Nav items       |  KPI cards row |
|                  |  Charts grid   |
|                  |  Data table    |
+------------------+----------------+
```

- Sidebar: fixed 240px, `var(--surface)` bg, `var(--border)` right border
- KPI cards: 4-col desktop, 2-col tablet, 1-col mobile
  - Large number: `text-3xl font-bold font-display`
  - Label: `text-sm opacity-70`
  - Trend indicator: green up / red down
- Charts: explicit canvas height, Chart.js IIFE pattern
- Data tables: striped rows, sticky header, horizontal scroll mobile
- Empty states: centered icon + message + CTA button

## Motion

| Trigger | Duration | Easing |
|---------|----------|--------|
| Hover | 200ms | ease |
| Layout change | 300ms | ease |
| Scroll reveal | 600ms | ease (opacity + translateY) |

Respect `prefers-reduced-motion: reduce` — disable all animations.

### Scroll Animation Pattern

```html
<style>.fade-up{opacity:0;transform:translateY(30px);transition:opacity 0.6s ease,transform 0.6s ease}.animate-in{opacity:1;transform:translateY(0)}</style>
<script>
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('animate-in')})},{threshold:0.1});
document.querySelectorAll('.fade-up').forEach(el=>observer.observe(el));
</script>
```

## Accessibility

- WCAG AA contrast ratios minimum
- All interactive elements: visible focus ring (`ring-2 ring-[var(--primary)]`)
- Images: meaningful `alt` text
- Form inputs: associated `<label>` elements
- Skip-to-content link on multi-section pages
