/**
 * Demo mode data layer for the mixtape app.
 *
 * Intercepts the API calls that `api.js` would make to the shared Express
 * backend and serves them from warm sample data persisted in localStorage.
 * Demo data is namespaced under 'demoData:mixtape' and NEVER touches the
 * real family shelf. No family key is required — demo mode never throws 401.
 *
 * Track shape is {song, artist} to match the API's tape schema; a `title`
 * alias is included as well because this app's UI renders track titles.
 */

const STORAGE_KEY = "demoData:mixtape";

function makeId() {
  return "demo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/* Track factory: {song, artist} per the API schema, plus `title` for the app's UI. */
function track(song, artist) {
  return { song, title: song, artist };
}

function seedTapes() {
  const now = new Date().toISOString();
  return [
    {
      _id: "demo-seed-road-trip",
      title: "Road Trip '26",
      sideA: [
        track("Sample in a Jar", "Phish"),
        track("Run Like an Antelope", "Phish"),
        track("Cheeseburger in Paradise", "Jimmy Buffett"),
        track("Come Monday", "Jimmy Buffett"),
      ],
      sideB: [
        track("Shake It Off", "Taylor Swift"),
        track("Take On Me", "a-ha"),
        track("Livin' on a Prayer", "Bon Jovi"),
        track("Bron-Yr-Aur", "Led Zeppelin"),
      ],
      createdAt: now,
    },
    {
      _id: "demo-seed-ballet-practice",
      title: "Ballet Practice",
      sideA: [
        track("Shake It Off", "Taylor Swift"),
        track("You Belong With Me", "Taylor Swift"),
        track("Love Story", "Taylor Swift"),
      ],
      sideB: [
        track("Enchanted", "Taylor Swift"),
        track("Style", "Taylor Swift"),
        track("Bejeweled", "Taylor Swift"),
      ],
      createdAt: now,
    },
  ];
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch {
    /* storage unavailable or corrupted — fall through to seeding */
  }
  const seeded = seedTapes();
  save(seeded);
  return seeded;
}

function save(tapes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tapes));
  } catch {
    /* private browsing or quota — demo just won't persist this time */
  }
}

function notFound() {
  throw Object.assign(new Error("Tape not found"), { status: 404 });
}

/* Normalize a request path for routing: strip the query string and an
   optional leading /api, so '/tapes', '/tapes?q=x' and '/api/tapes' all route. */
function routePath(path) {
  const clean = String(path || "").split("?")[0];
  const stripped = clean.replace(/^\/?api/, "");
  return stripped.startsWith("/") ? stripped : "/" + stripped;
}

export function handleDemoRequest(method, path, body) {
  const p = routePath(path);
  const tapes = load();

  if (method === "GET" && p === "/tapes") {
    return clone(tapes);
  }

  const sub = p.match(/^\/tapes\/([^/]+)$/);
  if (sub) {
    const id = decodeURIComponent(sub[1]);
    const idx = tapes.findIndex((t) => t._id === id || t.id === id);
    if (method === "GET") {
      if (idx === -1) notFound();
      return clone(tapes[idx]);
    }
    if (method === "DELETE") {
      if (idx === -1) notFound();
      tapes.splice(idx, 1);
      save(tapes);
      return { ok: true };
    }
  }

  if (method === "POST" && p === "/tapes") {
    const b = body || {};
    const doc = {
      _id: makeId(),
      title: b.title || "Untitled Tape",
      sideA: Array.isArray(b.sideA) ? clone(b.sideA) : [],
      sideB: Array.isArray(b.sideB) ? clone(b.sideB) : [],
      createdAt: new Date().toISOString(),
    };
    tapes.unshift(doc); // newest first, matching the API's sort
    save(tapes);
    return clone(doc);
  }

  const err = new Error(`Demo mode doesn't handle ${method} ${p}`);
  err.status = 404;
  throw err;
}
