import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { get, post, put, del, getFamilyKey, setFamilyKey, onAuthFailure } from "./api.js";
import FamilyKeyPrompt from "./FamilyKeyPrompt.jsx";
import { isDemoMode } from "./demoMode.js";

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
});
const seedToServer = (s) => ({
  title: s.title,
  suggestedBy: s.by,
  kidFriendly: s.kidFriendly,
  note: s.note,
  watched: false,
  rating: 0,
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

/* ---------- main app ---------- */
export default function App() {
  const demoMode = isDemoMode();
  const [movies, setMovies] = useState([]);
  const [kidOnly, setKidOnly] = useState(false);
  const [picking, setPicking] = useState(false);
  const [ratingId, setRatingId] = useState(null);
  const [form, setForm] = useState({ title: "", by: "", kidFriendly: true, note: "" });
  const [status, setStatus] = useState("loading"); // loading | need-key | error | ready
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const boot = () => {
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
  };

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
  const watchlist = useMemo(() => movies.filter((m) => !m.watched), [movies]);
  const history = useMemo(
    () => movies.filter((m) => m.watched).slice().reverse(),
    [movies]
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
      }));
      setMovies((ms) => [created, ...ms]);
      setForm({ title: "", by: "", kidFriendly: true, note: "" });
      setActionError("");
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
            {watchlist.length === 0 ? (
              <p className="empty">Nothing queued up! Add a pick above and let fate decide. 🎬</p>
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
