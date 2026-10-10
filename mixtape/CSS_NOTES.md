# Mixtape — CSS Beautification Pass (2026-10-08)

CSS-only pass on `src/index.css`. No JSX, logic, or behavior changes. Both `npm run build`
passes; `dist/` output confirmed. The `.spotify-panel` block was not restyled.

## What changed visually

**Header**
- Oversized headline: `clamp(2.8rem, 11vw, 4.6rem)` (~43px on a 390px phone, ~74px on
  desktop), tight letter-spacing, balanced wrapping.
- Solid terracotta-dark color (kept solid deliberately — the 📼 emoji in the title
  can blank out under transparent gradient-text fills in some browsers); depth comes
  from a layered warm text-shadow instead.
- Decorative terracotta→gold→terracotta-deep gradient rule under the tagline
  (pure CSS `::after`, no markup change); tagline slightly larger.

**Buttons (chunky, 48px targets)**
- Base buttons now 48px min-height with roomier padding and subtle letter-spacing.
- Primary buttons get a terracotta gradient + inner top highlight + warm drop shadow;
  hover deepens the gradient and lifts 2px.
- Ghost / danger / side-flip / track-row variants explicitly re-asserted so the
  global gradient never restyles them; the separately-designed Spotify panel keeps
  its green buttons (including on hover) via explicit preservation rules.

**Depth & cards**
- `--shadow` upgraded to a layered 3-stage shadow; new `--shadow-lg` for hover states.
- Tape cards, editor title row, side panels, and the full tracklist get a subtle warm
  gradient (`#ffffff → #fdf9f1`) plus a hairline terracotta border.
- Tape-card titles use fluid clamp sizing; card hover now lifts 4px onto the large
  layered shadow plus the existing soft glow ring.
- Track rows gain a hairline border for definition (gold closer rows unaffected).
- Side badges get a soft terracotta glow shadow.

**Empty library**
- Warm gradient, dashed terracotta border, roomier padding, fluid heading size.

**Viewer**
- Tape title bumped to `clamp(2rem, 6.5vw, 3rem)` with balanced wrapping
  (kept solid color — user tape titles may contain emoji).

**Background**
- Faint warm radial wash at the top of the page over the existing cream base.

## Guardrails kept
- Mobile-first; 390px baseline preserved (single-column tape grid, full-width action
  buttons, 44px+ targets, 16px inputs to stop iOS auto-zoom — all pre-existing).
- All hover effects live inside `@media (hover: hover)`; touch keeps `:active` press
  feedback and `:focus-visible` rings.
- `prefers-reduced-motion` blanket rule retained and covers every new transition
  (reel-spin animation included).
- Demo-mode banner (inline styles) and family-key prompt styling untouched.
