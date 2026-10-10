/* TMDB (The Movie Database) v3 client for Movie Night discovery.
   Uses the ?api_key= query-param style with the key baked in at build time
   from VITE_TMDB_API_KEY. When no key is set, the app shows a friendly
   setup card instead of the discovery UI — the family list keeps working. */

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w342";
const LOGO = "https://image.tmdb.org/t/p/w92";

const KEY = (import.meta.env.VITE_TMDB_API_KEY || "").trim();
export const hasTmdbKey = () => KEY.length > 0;

async function req(path, params = {}) {
  const q = new URLSearchParams({ api_key: KEY, language: "en-US", ...params });
  const res = await fetch(`${BASE}${path}?${q.toString()}`);
  if (!res.ok) {
    const err = new Error(
      res.status === 401
        ? "TMDB didn't accept that API key — double-check VITE_TMDB_API_KEY."
        : `TMDB hiccup (${res.status}) — try again in a bit.`
    );
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const posterUrl = (p) => (p ? `${IMG}${p}` : null);
export const logoUrl = (p) => (p ? `${LOGO}${p}` : null);

export const getGenres = () => req("/genre/movie/list").then((d) => d.genres || []);

export const searchMovies = (query, page = 1) =>
  req("/search/movie", { query, page: String(page), include_adult: "false" });

export const discoverMovies = (params) =>
  req("/discover/movie", { include_adult: "false", include_video: "false", ...params });

export const getWatchProviders = (tmdbId) => req(`/movie/${tmdbId}/watch/providers`);

/* ---- tiny localStorage cache: family title -> TMDB match (genre resolution) ----
   The "For you" rail resolves each loved movie's genres once, then reuses
   the cached genre_ids so we only hit the API once per title. */
const cacheKey = (title) => `tmdb-match:${title.trim().toLowerCase()}`;

export function getCachedMatch(title) {
  try {
    const raw = localStorage.getItem(cacheKey(title));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedMatch(title, match) {
  try {
    localStorage.setItem(cacheKey(title), JSON.stringify(match));
  } catch {
    /* storage unavailable */
  }
}

export async function resolveGenres(title) {
  const cached = getCachedMatch(title);
  if (cached) return cached.genre_ids || [];
  const data = await searchMovies(title, 1);
  const hit = (data.results || [])[0];
  const genre_ids = hit ? hit.genre_ids || [] : [];
  setCachedMatch(title, { id: hit ? hit.id : null, genre_ids });
  return genre_ids;
}
