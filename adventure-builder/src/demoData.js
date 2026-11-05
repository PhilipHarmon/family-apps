// Demo-mode data layer for Adventure Builder.
// Intercepts API calls when ?demo=1 is active and serves sample data
// from localStorage. Never touches the real family API and never
// needs the family key.

const STORE_KEY = 'demoData:adventure-builder';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seedState() {
  return {
    customPeople: [],
    selectedIds: ['philip', 'jessica', 'wyatt', 'pepper', 'briar'],
    lastRoles: {},
    recent: { A: [], B: [], C: [] },
    activeMission: null,
    log: [
      {
        date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        title: 'The Case of the Missing Acorns',
        setting: 'neighborhood',
        who: ['Philip', 'Jessica', 'Wyatt', 'Pepper', 'Briar'],
        found: 11,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to a fresh seed
  }
  const seed = seedState();
  saveStore(seed);
  return seed;
}

function saveStore(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — demo still works for the session
  }
}

export function handleDemoRequest(method, path, body) {
  if (path === '/adventures/state') {
    const state = loadStore();
    if (method === 'GET') return clone(state);
    if (method === 'PUT') {
      const next = { ...state, ...(body || {}), updatedAt: new Date().toISOString() };
      saveStore(next);
      return clone(next);
    }
  }
  throw new Error(`Demo mode doesn't know ${method} ${path}`);
}
