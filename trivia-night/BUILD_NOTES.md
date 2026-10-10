# Trivia Night — Build Notes (2026-10-08)

Feature upgrade bundle: multi-award scoring, confetti/fireworks, Movie Night favorites import, CSS beef-up.

## What changed

### Feature 1 — Award multiple players per question (sibling fairness)
- `src/App.jsx`: added an `awarded` state (player names already awarded on the current question).
- `awardPoints(name)` no longer auto-advances. It adds points, marks the player as awarded, fires a confetti burst, and ignores repeat taps on the same player.
- Award buttons show a ✓ and turn green once awarded; they're disabled so nobody can double-award.
- A full-width **"Next question →"** button now sits under the award grid (always visible once the answer is revealed, so a "nobody got it" round can advance too). On the final question it reads **"See the results →"**.
- **"Nobody got it 😅"** is unchanged — it just advances without awarding.
- `awarded` resets on every new question and when a game starts. Scoreboard and results logic untouched.

### Feature 2 — Confetti & fireworks (`canvas-confetti`)
- New dependency: `canvas-confetti` (added to `package.json` via `npm install`).
- Each award fires a short burst: ~75 particles, spread 70, from top-center.
- The results screen mounts a `ResultsFireworks` component that runs a ~2.5s sequence: opening volley left/center/right (0 / 250 / 500 ms), then encore bursts at 1.2s, 1.5s, 2.1s — each 60–100 particles. Timeouts are cleaned up on unmount, and it fires exactly once per results mount.
- Phone-friendly: modest particle counts, and `disableForReducedMotion: true` respects the OS reduced-motion setting (plus the app's existing `prefers-reduced-motion` CSS kill-switch).

### Feature 3 — "🎬 From Movie Night" on the setup screen
- New `MovieFavorites` component on the setup screen fetches `GET /movies` from the family API and lists movies with `favorite: true`, each with a **"Make it a question"** button.
- Clicking pre-fills the custom-question form's answer with the movie title, then smooth-scrolls to and focuses the question input — Philip just types the question (e.g. "What movie has a cowboy and a spaceman?").
- Codes against the agreed contract (`favorite: true/false` on movie objects, title via `m.title ?? m.name`).
- Never breaks setup: fetch failures (including demo mode, which 404s `/movies`) hide the section silently; zero favorites shows a one-line hint instead ("tap the ⭐ on movies in Movie Night…").

### Feature 4 — CSS beef-up (`src/index.css`)
- Oversized header: `clamp(2.75rem, 10vw, 4.5rem)`, weight 900, soft text-shadow; bigger bunting with drop shadow.
- Cards: layered triple box-shadow + subtle top-to-bottom gradient, 32px padding, 24px gaps.
- Chunkier buttons: all buttons min-height 48px, `.btn-small` min 44px; primary button gets a subtle vertical gradient + inner highlight.
- New styles: `.award-btn.awarded` (green ✓ state), `.next-q-btn` (full-width 54px), `.hint-inline`, `.movie-favorites` list polish.
- All hover effects (including the new gentle card lift) live inside `@media (hover: hover)`; touch keeps `:active` press feedback. Playful personality (bunting, trophy) preserved.

## New env vars
None. No new configuration — works with the existing `VITE_API_URL` / `VITE_FAMILY_KEY` setup.

## For Philip
- Demo mode (`?demo=1`) still works: the Movie Night section simply hides itself there, everything else is fully playable with sample data.
- The family-key auth flow is untouched; the `/movies` fetch goes through the same `get()` helper, so a bad key surfaces the normal family-key prompt.
- `node_modules` is in place; `dist/` contains a fresh production build. Nothing was committed to git — ready for Philip's usual merge/push flow.
- Note: the family-api still needs the `favorite` field on movies (being updated separately). Until then, the "From Movie Night" section will show the "no favorites yet" hint — it will light up automatically once the API supports it.
