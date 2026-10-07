/* Demo-mode backend for movie night.
   When ?demo=1 is present (see demoMode.js), every API call is intercepted
   in api.js and answered here from warm sample data persisted in localStorage.
   Demo mode never touches the real family server and never needs a family key. */

const LS_KEY = "demoData:movie-night";

const newId = () =>
  "demo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);

const clone = (v) => JSON.parse(JSON.stringify(v));

/* Warm seed data: six family picks, one already watched and rated. */
function seed() {
  const base = Date.now().toString(36);
  const sid = (n) => `demo-${base}-seed${n}`;
  return [
    {
      _id: sid(1),
      title: "Toy Story",
      suggestedBy: "Wyatt",
      kidFriendly: true,
      note: "To infinity… and movie night! Wyatt's been building the Pizza Planet truck in Lego.",
      watched: false,
      rating: 0,
    },
    {
      _id: sid(2),
      title: "Moana",
      suggestedBy: "Pepper",
      kidFriendly: true,
      note: "Pepper promises to sing along to at least two songs. Ballet intermission optional.",
      watched: false,
      rating: 0,
    },
    {
      _id: sid(3),
      title: "Bluey: The Sign",
      suggestedBy: "Briar",
      kidFriendly: true,
      note: "The extra-long Bluey special — bring tissues. Briar's number one request.",
      watched: false,
      rating: 0,
    },
    {
      _id: sid(4),
      title: "E.T. the Extra-Terrestrial",
      suggestedBy: "Jessica",
      kidFriendly: true,
      note: "Reese's Pieces required. Crying optional but likely.",
      watched: false,
      rating: 0,
    },
    {
      _id: sid(5),
      title: "Back to the Future",
      suggestedBy: "Philip",
      kidFriendly: true,
      note: "Dad's '80s pick — Great Scott! Time travel before bedtime.",
      watched: false,
      rating: 0,
    },
    {
      _id: sid(6),
      title: "The Goonies",
      suggestedBy: "Wyatt",
      kidFriendly: true,
      note: "Goonies never say die — last family movie night, and already a family classic.",
      watched: true,
      rating: 5,
    },
  ];
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* corrupted or unavailable storage — fall through and reseed */
  }
  const seeded = seed();
  save(seeded);
  return seeded;
}

function save(movies) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(movies));
  } catch {
    /* storage unavailable */
  }
}

function normalizePath(path) {
  let p = String(path || "").split("?")[0];
  if (p.startsWith("/api")) p = p.slice(4) || "/";
  return p;
}

const notFound = () => {
  throw Object.assign(new Error("Movie not found"), { status: 404 });
};

/**
 * Serve an API call from the local demo dataset.
 * `body` is the already-parsed request body (or undefined for GET/DELETE).
 * Never throws 401 — demo mode needs no family key.
 */
export function handleDemoRequest(method, path, body) {
  const p = normalizePath(path);
  const movies = load();

  // GET /movies
  if (method === "GET" && p === "/movies") {
    return clone(movies);
  }

  // POST /movies
  if (method === "POST" && p === "/movies") {
    const b = body || {};
    const movie = {
      _id: newId(),
      title: b.title ?? "",
      suggestedBy: b.suggestedBy ?? "",
      kidFriendly: !!b.kidFriendly,
      note: b.note ?? "",
      watched: !!b.watched,
      rating: b.rating ?? 0,
    };
    const next = [movie, ...movies];
    save(next);
    return clone(movie);
  }

  // /movies/:id
  const idMatch = p.match(/^\/movies\/([^/]+)$/);
  if (idMatch) {
    const id = decodeURIComponent(idMatch[1]);
    const idx = movies.findIndex((m) => m._id === id);
    if (idx === -1) notFound();

    if (method === "PUT") {
      // Partial updates: only apply fields actually present in the body
      // (saveRating sends just { watched, rating }; we must not wipe the title).
      const b = body || {};
      const updated = { ...movies[idx] };
      for (const key of ["title", "suggestedBy", "kidFriendly", "note", "watched", "rating"]) {
        if (b[key] !== undefined) updated[key] = b[key];
      }
      const next = movies.slice();
      next[idx] = updated;
      save(next);
      return clone(updated);
    }

    if (method === "DELETE") {
      const next = movies.filter((m) => m._id !== id);
      save(next);
      return { ok: true };
    }
  }

  const err = new Error(`Demo mode doesn't handle ${method} ${p}`);
  err.status = 404;
  throw err;
}
