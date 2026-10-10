# Movie Night — upgrade build notes (2026-10-08)

Major upgrade: real movie database (TMDB), taste-based picks, streaming info, favorites, CSS beef-up.

## What changed

### Feature 1 — TMDB integration (the "much bigger API")
- **New `src/tmdb.js`**: TMDB v3 API client using `?api_key=` with the key from `VITE_TMDB_API_KEY`.
  Base `https://api.themoviedb.org/3`, posters `https://image.tmdb.org/t/p/w342`, provider logos `.../t/p/w92`.
- **New "🔍 Discover movies" section**: title search (`/search/movie`) plus filtered browsing
  (`/discover/movie`) with multi-select genre chips (from `/genre/movie/list`), decade dropdown
  (2020s / 2010s / 2000s / 90s / 80s / pre-80s classics via `primary_release_date` range),
  minimum rating select (`vote_average.gte`), and the existing 🧒 Kid-friendly toggle which —
  when on — passes `certification_country=US&certification.lte=PG` to `/discover`.
- **Result cards**: poster, title, year, TMDB rating, short overview, "📺 Where to watch"
  expander that lazily loads `/movie/{id}/watch/providers` and shows US **flatrate / rent / buy**
  badges (provider name + logo). "➕ Add to list" POSTs to the family API `/movies` with
  `suggestedBy: "TMDB Discovery"` and the overview as the note.
- **Streaming honesty**: TMDB does **not** provide "leaving soon" / expiry dates, so none are
  shown or estimated. Every discover/for-you block carries the footnote:
  *"Streaming availability changes — check the app before popcorn time."*
- **No key / demo mode**: if `VITE_TMDB_API_KEY` is unset — or in `?demo=1` — Discover shows a
  friendly setup card ("Add a free TMDB API key to unlock discovery — themoviedb.org, free,
  no credit card"). The family list, picker, and ratings work fully without the key.

### Feature 2 — "🍿 For you" recommender (learns from the watch list)
- Builds a taste profile from **watched movies rated 4–5 stars**: each title is resolved to
  TMDB `genre_ids` via `/search/movie`, cached in `localStorage` as
  `tmdb-match:{lowercase-title}` → `{id, genre_ids}` (one API hit per title, ever).
- Weighted genre scores (weight = star rating), top 2–3 genres → `/discover/movie`
  (`vote_average.gte=7`, popularity-sorted), excluding titles already on the family list
  (loose lowercase-title match).
- Presented as a horizontal rail: **"🍿 For you — because you loved {titles}"**, with a
  "🔁 New picks" refresh button. Friendly empty state when fewer than 2 rated movies:
  *"Rate a few movies and I'll start picking up your taste."*
- This is a **genre-affinity heuristic, not machine learning** — the UI says so plainly
  ("no robots involved").

### Feature 3 — ❤️ Favorites, piped to Trivia
- `toClient` mapping now carries `favorite: !!m.favorite` (codes against the family-api
  contract: `favorite: Boolean, default false`; POST/PUT `/movies/:id` accept `{favorite}`).
- ❤️/🤍 heart toggle on every watchlist and history row (and on any TMDB result once added
  to the list) → `PUT /movies/:id {favorite}`.
- "🎬 All picks / ❤️ Favorites" filter chips above the watchlist.
- Demo-mode backend (`src/demoData.js`) also round-trips `favorite` (seed, POST, PUT).
- The Trivia app can read favorites via `GET /movies` and turn them into questions.

### Feature 4 — CSS beef-up
- Oversized hero header (clamp-scaled, up to 4.3rem, deep gradient + text shadow).
- Cards: layered triple shadows + subtle warm gradient backgrounds.
- TMDB poster cards lift on hover (**desktop only**, inside `@media (hover: hover)`).
- Chunky buttons, genre/filter chips, horizontal snap-scroll "For you" rail, provider badges.
- Phone-first throughout: 44px+ tap targets, existing responsive breakpoints kept,
  `prefers-reduced-motion` respected. Warm family-movie-night personality intact.

### Preserved
- Family-key auth flow, `?demo=1` demo mode (list fully works, Discover shows setup card),
  random picker with drumroll, star ratings, seed migration — all untouched.

## Environment variable

- **Exact name**: `VITE_TMDB_API_KEY`
- **Where Philip gets it**: themoviedb.org → create a free account → Settings → API →
  request an API key (choose "Developer"). Free, no credit card.
- **Render**: add `VITE_TMDB_API_KEY` as an environment variable on the movie-night
  **static site service**, then **trigger a rebuild** — Vite bakes `import.meta.env.*`
  values into the bundle at build time, so setting the var alone does nothing until
  the next build. (Same for local dev: put it in `.env` and restart `npm run dev`.)

## Streaming expiry honesty note

TMDB's API exposes *current* US watch providers only. It has no "leaving soon" or
expiry-date data, so the app never shows or estimates one. If Philip wants
leaving-soon alerts later, that needs a different data source (e.g. a JustWatch-style
feed) — not currently wired up.

## Verification

- `npm run lint` — 0 errors (1 pre-existing warning in the untouched Picker code).
- `npm run build` — clean; `dist/` contains `index.html` + hashed CSS/JS.
- Not committed (per instructions).
