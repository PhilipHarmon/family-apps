# Photo Journal — CSS Beautification Pass (2026-10-08)

CSS-only pass on `src/index.css`. No JSX, logic, or behavior changes. Both `npm run build`
passes; `dist/` output confirmed.

## What changed visually

**Header**
- Oversized editorial headline: `clamp(2.5rem, 9vw, 3.9rem)` (~40px on a 390px phone,
  ~62px on desktop), tight letter-spacing, balanced line wrapping.
- Terracotta gradient headline text (solid terracotta-deep kept as fallback).
- Decorative terracotta gradient rule above the title (pure CSS `::before`, no markup change).
- Slightly larger tagline.

**Depth & cards**
- `--shadow` upgraded to a layered 3-stage shadow (contact + ambient + far-field);
  new `--shadow-lg` for hero moments (streak banner, modal, card hovers).
- Calendar card, feed cards, and empty states get a subtle warm top-to-bottom gradient
  (`#fffdf9 → #fdf8ee`) plus a hairline terracotta border.
- Streak banner: richer 3-stop terracotta gradient, layered shadow, faint white border.

**Buttons (chunky, 44px+ targets)**
- `.btn` now 48px min-height, slightly larger type.
- `.btn-primary` gets a terracotta gradient + inner top highlight + warm drop shadow;
  hover deepens the gradient and lifts 2px.
- Active tab gets the same gradient treatment.
- Tab buttons and feed-action buttons guaranteed 44px min-height on all screens.

**Calendar**
- Card padding bumped to 24px; month title uses fluid clamp sizing.
- Day numbers semibold; "today" ring thickened to 3px.

**Feed (premium photo feel)**
- Cards spaced 28px apart; photo gets a hairline divider above the caption block.
- Captions now set in Georgia serif at 1.12rem/1.55 for an editorial journal feel.
- Date eyebrow tightened (smaller, wider letter-spacing).
- Hover: 3px lift onto the large layered shadow.

**Empty states**
- Dashed terracotta border, roomier padding, larger emoji and fluid heading size.

**Modal**
- Large layered shadow; fluid heading size.

**Background**
- Faint warm radial wash at the top of the page over the existing cream base.

## Guardrails kept
- Mobile-first; verified mentally at 390px (header ~40px, 7 calendar columns intact,
  buttons full-width in stacked modal actions).
- All hover effects live inside `@media (hover: hover)`; touch keeps `:active` press
  feedback and `:focus-visible` rings.
- `prefers-reduced-motion` blanket rule retained and covers every new transition.
- Demo-mode banner (inline styles) and family-key prompt styling untouched.
