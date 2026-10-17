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

---

# Photo Journal v13 — Real-Time Uploads + Multi-Photo Days + Video (2026-10-13)

## What changed
- **Direct uploads**: new `src/cloudinary.js` uploads straight to Cloudinary (unsigned preset, `auto` resource type) with real progress bars via XMLHttpRequest. 100MB client-side guard with a friendly message.
- **Day view is now a gallery**: the old one-photo-per-day modal became `DayModal` — a grid of all items for the day, each with its own caption (140 chars), per-item edit/delete. "Add photos / videos" button opens the native picker (camera roll on iPhone), uploads each with progress, then saves to the API.
- **Video support**: `mediaType: 'image' | 'video'` on Photo docs (backend + frontend). Videos render with `<video controls preload="metadata" playsInline>`; calendar days whose first item is a video show a ▶ tile; multi-item days show a `+N` badge.
- **Paste-a-URL kept** as a secondary collapsible path for backward compatibility.
- **Streak logic**: a day counts with ≥1 item (was: exactly one entry per date key). Existing single-photo days carry over untouched — old docs without `mediaType` read as images.
- **Header**: "One Day, One Photo" → "One Day, Many Memories" (it can hold videos now).
- **Demo mode** (`?demo=1`): updated to the gallery shape; 2026-10-04 has 2 photos + 1 sample video clip.
- **render.yaml**: photo-journal service gained `VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET` (`sync: false` — Philip fills them in the Render dashboard).

## Cloudinary setup for Philip (5 minutes, one time)
1. Free account at cloudinary.com → dashboard → note the **Cloud name** (top of the dashboard).
2. Settings (gear) → **Upload** → scroll to *Upload presets* → **Add upload preset**.
   - Name it `family-journal`. **Signing Mode: Unsigned.** Folder: `photo-journal`.
   - Leave everything else default → Save.
3. Render dashboard → **photo-journal** service → Environment → add:
   - `VITE_CLOUDINARY_CLOUD_NAME` = your cloud name
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = `family-journal`
4. Save — Render redeploys the photo-journal frontend. Open the app: the upload button now works.
   - Until these are set, the app shows a friendly "ask Fred" hint instead of a broken button.

Why unsigned is safe here: an unsigned preset can only upload into your Cloudinary account under the rules you set (folder, file types, size caps) — there is no secret in the app to leak. The family key still gates the family-api.

## Notes / to verify on a real phone
- iPhone picker behavior (`<input type=file multiple accept="image/*,video/*">`) untested on-device — expect the camera-roll sheet; confirm multi-select works on iOS 26.
- Large video uploads on cellular: progress bar shows, but Wi-Fi recommended (noted in-app).
- Free Cloudinary: 25GB storage — plenty for family use; keep an eye on it if beach-day epics pile up.
