import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { get, post, put, del, getFamilyKey, setFamilyKey, onAuthFailure } from "./api.js";
import FamilyKeyPrompt from "./FamilyKeyPrompt.jsx";
import { isDemoMode } from "./demoMode.js";
import {
  hasTmdbKey,
  posterUrl,
  logoUrl,
  getGenres,
  searchMovies,
  discoverMovies,
  getWatchProviders,
  resolveGenres,
} from "./tmdb.js";

/* ---------- seed data ---------- */
const SEED = [
  { title: "Bluey: The Sign", by: "Briar", kidFriendly: true, note: "The extra-long Bluey special — bring tissues." },
  { title: "Moana", by: "Pepper", kidFriendly: true, note: "We can stop trying to say 'shiny' like Tamatoa." },
  { title: "Encanto", by: "Briar", kidFriendly: true, note: "We don't talk about Bruno. We DO sing about Bruno." },
  { title: "Toy Story", by: "Wyatt", kidFriendly: true, note: "To infinity… and movie night!" },
  { title: "The Goonies", by: "Dad", kidFriendly: true, note: "Goonies never say die. Dad's childhood, finally shared." },
  { title: "E.T. the Extra-Terrestrial", by: "Mom", kidFriendly: true, note: "Reese's Pieces required. Crying optional but likely." },
  { title: "Back to the Future", by: "Wyatt", kidFriendly: true, note: "Great Scott! Time travel before bedtime." },
  { title: "Honey, I Shrunk the Kids", by: "Dad", kidFriendly: true, note: "The backyard has never looked bigger." },
];

/* ---------- shape mapping: server {_id, suggestedBy} <-> client {id, by} ---------- */
const toClient = (m) => ({
  id: m._id,
  title: m.title,
  by: m.suggestedBy,
  kidFriendly: !!m.kidFriendly,
  note: m.note || "",
  watched: !!m.watched,
  rating: m.rating || 0,
  favorite: !!m.favorite,
});
const seedToServer = (s) => ({
  title: s.title,
  suggestedBy: s.by,
  kidFriendly: s.kidFriendly,
  note: s.note,
  watched: false,
  rating: 0,
  favorite: false,
});

/* Shared in-flight load so StrictMode's double-mount can't seed twice. */
let sharedLoad = null;
function loadMovies() {
  if (!sharedLoad) {
    const p = (async () => {
      let list = await get("/movies");
      if (!Array.isArray(list)) list = [];
      if (list.length === 0) {
        // First run: migrate the 8 seeded family picks, then re-read.
        for (const seed of SEED) {
          await post("/movies", seedToServer(seed));
        }
        list = await get("/movies");
        if (!Array.isArray(list)) list = [];
      }
      return list.map(toClient);
    })();
    sharedLoad = p;
    p.then(
      () => { if (sharedLoad === p) sharedLoad = null; },
      () => { if (sharedLoad === p) sharedLoad = null; }
    );
  }
  return sharedLoad;
}

/* ---------- tiny star row ---------- */
function Stars({ value, onPick, size = "1.6rem" }) {
  return (
    <div className="stars" role="radiogroup" aria-label="Family rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={n <= value ? "star lit" : "star"}
          style={{ fontSize: size }}
          onClick={() => onPick && onPick(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ---------- favorite heart ---------- */
function Heart({ on, onToggle, title }) {
  return (
    <button
      type="button"
      className={`heart ${on ? "on" : ""}`}
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from favorites` : `Save ${title} as a favorite`}
      title={on ? "Favorited ❤️" : "Save as favorite"}
    >
      {on ? "❤️" : "🤍"}
    </button>
  );
}

/* ---------- the big randomizer ---------- */
function Picker({ candidates, onClose, onMarkWatched }) {
  const [phase, setPhase] = useState("shuffling"); // shuffling | landed
  const [shown, setShown] = useState(candidates[0]);
  const [winner] = useState(() => candidates[Math.floor(Math.random() * candidates.length)]);
  const timers = useRef([]);

  useEffect(() => {
    // Drumroll: titles fly by fast, then slower and slower until the winner lands.
    const steps = 26;
    for (let i = 0; i < steps; i++) {
      const delay = 70 + Math.pow(i / steps, 2.4) * 2600;
      timers.current.push(
        setTimeout(() => {
          if (i < steps - 1) {
            setShown(candidates[Math.floor(Math.random() * candidates.length)]);
          } else {
            setShown(winner);
            setPhase("landed");
          }
        }, delay)
      );
    }
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="Movie picker">
      <div className={`picker-card ${phase}`}>
        {phase === "shuffling" ? (
          <>
            <p className="picker-kicker">🥁 Drumroll, please…</p>
            <h2 className="picker-title flicker" key={shown.id}>{shown.title}</h2>
            <p className="picker-sub">Spinning the popcorn bowl…</p>
          </>
        ) : (
          <>
            <p className="picker-kicker">🎉 Tonight we watch…</p>
            <h2 className="picker-title landed">{winner.title}</h2>
            <p className="picker-sub">
              Suggested by <strong>{winner.by}</strong>
              {winner.note ? ` — ${winner.note}` : ""}
            </p>
            <div className="picker-actions">
              <button className="btn primary" onClick={() => { onMarkWatched(winner.id); onClose(); }}>
                🍿 Watched it — rate it
              </button>
              <button className="btn ghost" onClick={onClose}>Not tonight</button>
            </div>
          </>
        )}
        {phase === "shuffling" && (
          <button className="btn ghost picker-skip" onClick={onClose}>Skip the suspense</button>
        )}
      </div>
    </div>
  );
}

/* ---------- rating dialog ---------- */
function RateDialog({ movie, onDone, onCancel }) {
  const [stars, setStars] = useState(5);
  const labels = ["Meh…", "Not bad", "Pretty good", "Great one!", "Family classic!"];
  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="Rate the movie">
      <div className="picker-card">
        <p className="picker-kicker">⭐ How was it, family?</p>
        <h2 className="picker-title">{movie.title}</h2>
        <Stars value={stars} onPick={setStars} />
        <p className="rate-label">{labels[stars - 1]}</p>
        <div className="picker-actions">
          <button className="btn primary" onClick={() => onDone(stars)}>Save rating</button>
          <button className="btn ghost" onClick={onCancel}>Never mind</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- streaming providers (lazy per-card) ---------- */
function ProviderBadge({ p }) {
  return (
    <span className="provider-badge">
      {p.logo_path && (
        <img src={logoUrl(p.logo_path)} alt="" loading="lazy" width="26" height="26" />
      )}
      {p.provider_name}
    </span>
  );
}

function Providers({ tmdbId }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("idle"); // idle | loading | done | none | error
  const [groups, setGroups] = useState(null);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (state === "done" || state === "none" || state === "error") return;
    setState("loading");
    try {
      const d = await getWatchProviders(tmdbId);
      const us = d.results && d.results.US;
      const flat = (us && us.flatrate) || [];
      const rent = ((us && us.rent) || []).slice(0, 4);
      const buy = ((us && us.buy) || []).slice(0, 4);
      if (!flat.length && !rent.length && !buy.length) {
        setState("none");
        return;
      }
      setGroups({ flat, rent, buy });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="providers">
      <button type="button" className="linklike" onClick={toggle} aria-expanded={open}>
        {open ? "▾ Hide streaming" : "📺 Where to watch"}
      </button>
      {open && state === "loading" && <p className="muted small">Checking streaming…</p>}
      {open && state === "none" && (
        <p className="muted small">No US streaming info on TMDB for this one.</p>
      )}
      {open && state === "error" && (
        <p className="muted small">Couldn't load streaming info.</p>
      )}
      {open && state === "done" && groups && (
        <div className="provider-groups">
          {groups.flat.length > 0 && (
            <div className="provider-group">
              <p className="provider-label">Streaming now on</p>
              <div className="provider-row">
                {groups.flat.map((p) => (
                  <ProviderBadge key={p.provider_id} p={p} />
                ))}
              </div>
            </div>
          )}
          {groups.rent.length > 0 && (
            <div className="provider-group">
              <p className="provider-label">Rent</p>
              <div className="provider-row">
                {groups.rent.map((p) => (
                  <ProviderBadge key={p.provider_id} p={p} />
                ))}
              </div>
            </div>
          )}
          {groups.buy.length > 0 && (
            <div className="provider-group">
              <p className="provider-label">Buy</p>
              <div className="provider-row">
                {groups.buy.map((p) => (
                  <ProviderBadge key={p.provider_id} p={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- one TMDB result card ---------- */
function TmdbCard({ r, onAdd, onList }) {
  const year = (r.release_date || "").slice(0, 4);
  const rating = typeof r.vote_average === "number" ? r.vote_average.toFixed(1) : "–";
  return (
    <article className="tmdb-card">
      {posterUrl(r.poster_path) ? (
        <img
          className="tmdb-poster"
          src={posterUrl(r.poster_path)}
          alt={`${r.title} poster`}
          loading="lazy"
        />
      ) : (
        <div className="tmdb-poster-fallback" aria-hidden="true">🎬</div>
      )}
      <div className="tmdb-body">
        <h3 className="tmdb-title">{r.title}</h3>
        <p className="tmdb-meta">{year || "Year unknown"} · ⭐ {rating}/10</p>
        {r.overview && <p className="tmdb-overview">{r.overview}</p>}
        <Providers tmdbId={r.id} />
        {onList ? (
          <button className="btn small" disabled>✅ On the list</button>
        ) : (
          <button className="btn small primary" onClick={() => onAdd(r)}>
            ➕ Add to list
          </button>
        )}
      </div>
    </article>
  );
}

/* ---------- setup card when no TMDB key ---------- */
function TmdbSetupCard() {
  return (
    <div className="tmdb-setup">
      <p className="tmdb-setup-emoji">🔑</p>
      <h3>Unlock movie discovery</h3>
      <p className="muted">
        Add a free TMDB API key to search millions of movies, browse by genre,
        get picks based on your taste, and see where to stream them.
        Get one at <strong>themoviedb.org</strong> — free, no credit card.
      </p>
      <p className="muted small">
        Set <code>VITE_TMDB_API_KEY</code> in your environment and rebuild the app.
      </p>
    </div>
  );
}

/* ---------- discover movies (TMDB) ---------- */
const DECADES = [
  { label: "Any decade", gte: "", lte: "" },
  { label: "2020s", gte: "2020-01-01", lte: "2026-12-31" },
  { label: "2010s", gte: "2010-01-01", lte: "2019-12-31" },
  { label: "2000s", gte: "2000-01-01", lte: "2009-12-31" },
  { label: "90s", gte: "1990-01-01", lte: "1999-12-31" },
  { label: "80s", gte: "1980-01-01", lte: "1989-12-31" },
  { label: "Classics (pre-80s)", gte: "", lte: "1979-12-31" },
];

function Discover({ kidOnly, onAddTmdb, isOnList }) {
  const [genres, setGenres] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [decade, setDecade] = useState(0);
  const [minRating, setMinRating] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getGenres()
      .then(setGenres)
      .catch(() => {});
  }, []);

  const toggleGenre = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((g) => g !== id) : [...s, id]));

  const run = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let data;
      if (query.trim()) {
        data = await searchMovies(query.trim());
      } else {
        const dec = DECADES[decade];
        data = await discoverMovies({
          sort_by: "popularity.desc",
          "vote_count.gte": "20",
          ...(selected.length ? { with_genres: selected.join(",") } : {}),
          ...(dec.gte ? { "primary_release_date.gte": dec.gte } : {}),
          ...(dec.lte ? { "primary_release_date.lte": dec.lte } : {}),
          ...(minRating ? { "vote_average.gte": minRating } : {}),
          ...(kidOnly ? { certification_country: "US", "certification.lte": "PG" } : {}),
        });
      }
      setResults((data.results || []).slice(0, 18));
    } catch (err) {
      setError(err.message || "TMDB didn't answer — try again.");
    }
    setLoading(false);
  };

  return (
    <section className="card discover-card" aria-label="Discover movies">
      <h2>🔍 Discover movies</h2>
      <p className="muted">
        Search millions of titles or browse by genre, decade, and rating — powered by TMDB.
        {kidOnly && <strong> 🧒 Kid-friendly is on, so discovery sticks to PG and under.</strong>}
      </p>
      <form className="discover-controls" onSubmit={run}>
        <input
          className="field"
          placeholder="Search by title… (or leave empty to browse)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={80}
          aria-label="Search movies by title"
        />
        {genres.length > 0 && (
          <div className="chip-row" role="group" aria-label="Genres">
            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`chip ${selected.includes(g.id) ? "on" : ""}`}
                aria-pressed={selected.includes(g.id)}
                onClick={() => toggleGenre(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
        <div className="discover-row">
          <select
            className="field"
            value={decade}
            onChange={(e) => setDecade(Number(e.target.value))}
            aria-label="Decade"
          >
            {DECADES.map((d, i) => (
              <option key={d.label} value={i}>{d.label}</option>
            ))}
          </select>
          <select
            className="field"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            aria-label="Minimum rating"
          >
            <option value="">Any rating</option>
            <option value="6">⭐ 6+</option>
            <option value="7">⭐ 7+</option>
            <option value="8">⭐ 8+</option>
          </select>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Searching…" : "🎬 Find movies"}
          </button>
        </div>
      </form>

      {error && <p className="action-error" role="alert">{error}</p>}

      {results && results.length === 0 && !loading && (
        <p className="empty">No movies matched — loosen a filter or two and try again. 🍿</p>
      )}
      {results && results.length > 0 && (
        <>
          <div className="tmdb-grid">
            {results.map((r) => (
              <TmdbCard key={r.id} r={r} onAdd={onAddTmdb} onList={isOnList(r.title)} />
            ))}
          </div>
          <p className="stream-note">
            Streaming availability changes — check the app before popcorn time.
          </p>
        </>
      )}
    </section>
  );
}

/* ---------- "For you" rail: genre-affinity picks from the family's taste ---------- */
function joinTitles(titles) {
  if (titles.length <= 1) return titles[0] || "";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

function ForYou({ movies, onAddTmdb, isOnList }) {
  const loved = useMemo(
    () => movies.filter((m) => m.watched && m.rating >= 4),
    [movies]
  );
  const lovedKey = useMemo(
    () => loved.map((m) => `${m.title.toLowerCase()}::${m.rating}`).sort().join("|"),
    [loved]
  );
  const [picks, setPicks] = useState(null);
  const [lovedTitles, setLovedTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (loved.length < 2) {
        if (!cancelled) {
          setPicks([]);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setLoading(true);
        setError("");
      }
      try {
        // Weighted genre scores from the family's 4–5 star movies.
        const scores = {};
        const used = [];
        for (const m of loved) {
          const gids = await resolveGenres(m.title);
          if (cancelled) return;
          if (!gids.length) continue;
          used.push(m.title);
          for (const g of gids) scores[g] = (scores[g] || 0) + m.rating;
        }
        const topGenres = Object.entries(scores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([g]) => g);
        if (!topGenres.length) {
          if (!cancelled) {
            setPicks([]);
            setLoading(false);
          }
          return;
        }
        const onList = new Set(movies.map((m) => m.title.trim().toLowerCase()));
        const data = await discoverMovies({
          with_genres: topGenres.join(","),
          "vote_average.gte": "7",
          "vote_count.gte": "50",
          sort_by: "popularity.desc",
        });
        if (cancelled) return;
        const fresh = (data.results || [])
          .filter((r) => !onList.has((r.title || "").trim().toLowerCase()))
          .slice(0, 10);
        setLovedTitles(used.slice(0, 3));
        setPicks(fresh);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Couldn't build picks right now.");
          setPicks([]);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lovedKey, nonce]);

  return (
    <section className="card foryou-card" aria-label="Recommended for you">
      <div className="foryou-head">
        <h2>🍿 For you</h2>
        {loved.length >= 2 && !loading && (
          <button className="btn small ghost" onClick={() => setNonce((n) => n + 1)}>
            🔁 New picks
          </button>
        )}
      </div>
      {loved.length < 2 ? (
        <p className="empty">
          Rate a few movies and I'll start picking up your taste. (This just looks at the
          genres of your 4–5 star picks — no robots involved.)
        </p>
      ) : loading ? (
        <p className="muted">Reading the family's taste… 🍿</p>
      ) : error ? (
        <p className="action-error" role="alert">{error}</p>
      ) : picks && picks.length > 0 ? (
        <>
          <p className="muted">
            Because you loved {joinTitles(lovedTitles)} — same kinds of movies, highly rated:
          </p>
          <div className="rail">
            {picks.map((r) => (
              <TmdbCard key={r.id} r={r} onAdd={onAddTmdb} onList={isOnList(r.title)} />
            ))}
          </div>
          <p className="stream-note">
            Streaming availability changes — check the app before popcorn time.
          </p>
        </>
      ) : (
        <p className="empty">
          Hmm, I couldn't find fresh picks from your ratings yet — rate a couple more
          movies and hit “New picks”. 🍿
        </p>
      )}
    </section>
  );
}

/* ---------- main app ---------- */
export default function App() {
  const demoMode = isDemoMode();
  const tmdbEnabled = hasTmdbKey() && !demoMode;
  const [movies, setMovies] = useState([]);
  const [kidOnly, setKidOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [picking, setPicking] = useState(false);
  const [ratingId, setRatingId] = useState(null);
  const [form, setForm] = useState({ title: "", by: "", kidFriendly: true, note: "" });
  const [status, setStatus] = useState("loading"); // loading | need-key | error | ready
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const boot = useCallback(() => {
    setStatus("loading");
    setLoadError("");
    setActionError("");
    loadMovies()
      .then((list) => {
        setMovies(list);
        setStatus("ready");
      })
      .catch((e) => {
        if (e.status === 401) return; // auth handler already re-showed the key prompt
        setLoadError(e.message || "The movie list wouldn't load.");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    onAuthFailure(() => {
      setMovies([]);
      setRatingId(null);
      setPicking(false);
      setStatus("need-key");
    });
    if (getFamilyKey() || demoMode) {
      boot();
    } else {
      setStatus("need-key");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const candidates = useMemo(
    () => movies.filter((m) => !m.watched && (!kidOnly || m.kidFriendly)),
    [movies, kidOnly]
  );
  const watchlist = useMemo(
    () => movies.filter((m) => !m.watched && (!favOnly || m.favorite)),
    [movies, favOnly]
  );
  const history = useMemo(
    () => movies.filter((m) => m.watched).slice().reverse(),
    [movies]
  );
  const onListTitles = useMemo(
    () => new Set(movies.map((m) => m.title.trim().toLowerCase())),
    [movies]
  );
  const isOnList = useCallback(
    (title) => onListTitles.has((title || "").trim().toLowerCase()),
    [onListTitles]
  );
  const ratingMovie = ratingId ? movies.find((m) => m.id === ratingId) : null;

  const noteActionError = (e) =>
    setActionError(e.message || "That didn't go through — try again.");

  const addMovie = async (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    try {
      const created = toClient(await post("/movies", {
        title,
        suggestedBy: form.by.trim() || "Mystery suggester",
        kidFriendly: form.kidFriendly,
        note: form.note.trim(),
        watched: false,
        rating: 0,
        favorite: false,
      }));
      setMovies((ms) => [created, ...ms]);
      setForm({ title: "", by: "", kidFriendly: true, note: "" });
      setActionError("");
    } catch (e) {
      noteActionError(e);
    }
  };

  const addTmdbMovie = async (r) => {
    try {
      const created = toClient(await post("/movies", {
        title: r.title,
        suggestedBy: "TMDB Discovery",
        kidFriendly: kidOnly,
        note: (r.overview || "").slice(0, 140),
        watched: false,
        rating: 0,
        favorite: false,
      }));
      setMovies((ms) => [created, ...ms]);
      setActionError("");
    } catch (e) {
      noteActionError(e);
    }
  };

  const toggleFavorite = async (id) => {
    const m = movies.find((x) => x.id === id);
    if (!m) return;
    try {
      await put(`/movies/${encodeURIComponent(id)}`, { favorite: !m.favorite });
      setMovies((ms) => ms.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x)));
    } catch (e) {
      noteActionError(e);
    }
  };

  const removeMovie = async (id) => {
    try {
      await del(`/movies/${encodeURIComponent(id)}`);
      setMovies((ms) => ms.filter((m) => m.id !== id));
    } catch (e) {
      noteActionError(e);
    }
  };
  const saveRating = async (id, stars) => {
    try {
      await put(`/movies/${encodeURIComponent(id)}`, { watched: true, rating: stars });
      setMovies((ms) => ms.map((m) => (m.id === id ? { ...m, watched: true, rating: stars } : m)));
    } catch (e) {
      noteActionError(e);
    }
  };
  const reRate = async (id, stars) => {
    try {
      await put(`/movies/${encodeURIComponent(id)}`, { rating: stars });
      setMovies((ms) => ms.map((m) => (m.id === id ? { ...m, rating: stars } : m)));
    } catch (e) {
      noteActionError(e);
    }
  };
  const unwatch = async (id) => {
    try {
      await put(`/movies/${encodeURIComponent(id)}`, { watched: false, rating: 0 });
      setMovies((ms) => ms.map((m) => (m.id === id ? { ...m, watched: false, rating: 0 } : m)));
    } catch (e) {
      noteActionError(e);
    }
  };

  const handleKeySave = (key) => {
    setFamilyKey(key);
    boot();
  };

  if (status === "need-key" && !demoMode) {
    return (
      <div className="page">
        <header className="hero">
          <div className="hero-inner">
            <p className="hero-emoji">🍿</p>
            <h1>Movie Night</h1>
            <p className="tagline">The little app that ends the “what are we watching?” debate.</p>
          </div>
        </header>
        <FamilyKeyPrompt onSave={handleKeySave} />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="page">
        <div className="state-wrap" role="status" aria-live="polite">
          <p className="state-emoji">🍿</p>
          <h2>Popping the popcorn…</h2>
          <p className="muted">Fetching the family's movie list.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page">
        <div className="state-wrap">
          <p className="state-emoji">📡</p>
          <h2>Couldn't reach movie night</h2>
          <p className="muted">{loadError || "The shared list is unreachable right now."}</p>
          <button className="btn primary" onClick={boot}>🔁 Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {demoMode && (
        <div
          style={{
            background: "linear-gradient(90deg, #7c2d12, #b45309)",
            color: "#fff7ed",
            padding: "0.5rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
            flexWrap: "wrap",
          }}
        >
          <span>🎬 Demo preview — sample data, saved in this browser only.</span>
          <button
            type="button"
            onClick={() => { localStorage.removeItem("demoData:movie-night"); window.location.reload(); }}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff7ed",
              border: "1px solid rgba(255,255,255,0.45)",
              borderRadius: "999px",
              padding: "0.2rem 0.8rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset demo
          </button>
        </div>
      )}
      <header className="hero">
        <div className="hero-inner">
          <p className="hero-emoji">🍿</p>
          <h1>Movie Night</h1>
          <p className="tagline">The little app that ends the “what are we watching?” debate.</p>
        </div>
      </header>

      <main className="wrap">
        {actionError && (
          <p className="action-error" role="alert">
            <span>{actionError}</span>
            <button className="linklike" onClick={() => setActionError("")} aria-label="Dismiss">
              ✕
            </button>
          </p>
        )}

        {/* Pick card */}
        <section className="card pick-card">
          <div className="pick-row">
            <div>
              <h2>Decision time</h2>
              <p className="muted">
                {candidates.length === 0
                  ? watchlist.length === 0
                    ? "The list is empty — add a movie below and the magic can begin."
                    : "Nothing fits the current filter. Loosen up or add more picks!"
                  : `${candidates.length} movie${candidates.length === 1 ? "" : "s"} in the running.`}
              </p>
            </div>
            <button
              className="btn primary big"
              disabled={candidates.length === 0}
              onClick={() => setPicking(true)}
            >
              🎲 Pick for us!
            </button>
          </div>
          <label className="toggle-row">
            <button
              type="button"
              role="switch"
              aria-checked={kidOnly}
              className={`switch ${kidOnly ? "on" : ""}`}
              onClick={() => setKidOnly((v) => !v)}
            >
              <span className="knob" />
            </button>
            <span className="toggle-label">🧒 Kid-friendly only <span className="muted">(Briar-safe mode)</span></span>
          </label>
        </section>

        {/* For-you rail (TMDB key required) */}
        {tmdbEnabled && (
          <ForYou movies={movies} onAddTmdb={addTmdbMovie} isOnList={isOnList} />
        )}

        {/* Discover (TMDB) */}
        {tmdbEnabled ? (
          <Discover kidOnly={kidOnly} onAddTmdb={addTmdbMovie} isOnList={isOnList} />
        ) : (
          <section className="card" aria-label="Discover movies">
            <h2>🔍 Discover movies</h2>
            <TmdbSetupCard />
          </section>
        )}

        <div className="columns">
          {/* Add + watchlist */}
          <section className="card">
            <h2>Add a pick</h2>
            <form className="add-form" onSubmit={addMovie}>
              <input
                className="field"
                placeholder="Movie title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={80}
              />
              <div className="form-row">
                <input
                  className="field"
                  placeholder="Suggested by (e.g. Wyatt)"
                  value={form.by}
                  onChange={(e) => setForm({ ...form, by: e.target.value })}
                  maxLength={30}
                />
                <label className="toggle-row small">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.kidFriendly}
                    className={`switch ${form.kidFriendly ? "on" : ""}`}
                    onClick={() => setForm({ ...form, kidFriendly: !form.kidFriendly })}
                  >
                    <span className="knob" />
                  </button>
                  <span className="toggle-label">Kid-friendly</span>
                </label>
              </div>
              <input
                className="field"
                placeholder="Optional note — why this one?"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                maxLength={140}
              />
              <button className="btn primary" type="submit" disabled={!form.title.trim()}>
                ➕ Add to the list
              </button>
            </form>

            <h2 className="section-gap">On the list <span className="count">{watchlist.length}</span></h2>
            <div className="chip-row" role="group" aria-label="Watchlist filter">
              <button
                type="button"
                className={`chip ${!favOnly ? "on" : ""}`}
                aria-pressed={!favOnly}
                onClick={() => setFavOnly(false)}
              >
                🎬 All picks
              </button>
              <button
                type="button"
                className={`chip ${favOnly ? "on" : ""}`}
                aria-pressed={favOnly}
                onClick={() => setFavOnly(true)}
              >
                ❤️ Favorites
              </button>
            </div>
            {watchlist.length === 0 ? (
              <p className="empty">
                {favOnly
                  ? "No favorites yet — tap the 🤍 on any pick to save it here. ❤️"
                  : "Nothing queued up! Add a pick above and let fate decide. 🎬"}
              </p>
            ) : (
              <ul className="movie-list">
                {watchlist.map((m) => (
                  <li key={m.id} className="movie">
                    <div className="movie-main">
                      <p className="movie-title">
                        {m.title}
                        {m.kidFriendly && <span className="badge" title="Kid-friendly">🧒</span>}
                      </p>
                      <p className="movie-meta">
                        Suggested by <strong>{m.by}</strong>
                        {m.note ? <> — <em>{m.note}</em></> : null}
                      </p>
                    </div>
                    <div className="movie-actions">
                      <Heart on={m.favorite} onToggle={() => toggleFavorite(m.id)} title={m.title} />
                      <button className="btn small" onClick={() => setRatingId(m.id)} title="Mark as watched and rate it">
                        ✅ Watched
                      </button>
                      <button className="btn small danger-ghost" onClick={() => removeMovie(m.id)} title="Delete this pick" aria-label={`Delete ${m.title}`}>
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* History */}
          <section className="card">
            <h2>Watched history <span className="count">{history.length}</span></h2>
            {history.length === 0 ? (
              <p className="empty">No movies conquered yet. Press the big button and make some memories! 🍿</p>
            ) : (
              <ul className="movie-list">
                {history.map((m) => (
                  <li key={m.id} className="movie watched">
                    <div className="movie-main">
                      <p className="movie-title">{m.title}</p>
                      <Stars value={m.rating} onPick={(n) => reRate(m.id, n)} size="1.05rem" />
                      <p className="movie-meta">Suggested by <strong>{m.by}</strong></p>
                    </div>
                    <div className="movie-actions">
                      <Heart on={m.favorite} onToggle={() => toggleFavorite(m.id)} title={m.title} />
                      <button className="linklike" onClick={() => unwatch(m.id)} title="Put it back on the list">
                        ↩ rewatch
                      </button>
                      <button className="linklike danger" onClick={() => removeMovie(m.id)} title="Delete" aria-label={`Delete ${m.title}`}>
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="footer">
          <p>May your popcorn be buttery and your debates be short. 🧈</p>
        </footer>
      </main>

      {picking && candidates.length > 0 && (
        <Picker
          candidates={candidates}
          onClose={() => setPicking(false)}
          onMarkWatched={(id) => setRatingId(id)}
        />
      )}
      {ratingMovie && (
        <RateDialog
          movie={ratingMovie}
          onDone={(stars) => { saveRating(ratingMovie.id, stars); setRatingId(null); }}
          onCancel={() => setRatingId(null)}
        />
      )}
    </div>
  );
}
