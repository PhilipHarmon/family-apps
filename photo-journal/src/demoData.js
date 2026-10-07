// Demo-mode data layer for the photo journal.
// Intercepts API calls when ?demo=1 is in the URL and serves warm sample
// data from localStorage. Demo mode never touches the real shared API
// and never requires a family key.

const STORAGE_KEY = 'demoData:photo-journal';

function newId() {
  return 'demo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

const clone = (v) => JSON.parse(JSON.stringify(v));

function seedData() {
  return [
    {
      _id: newId(),
      date: '2026-10-04',
      imageUrl: 'https://picsum.photos/seed/ballet/600/400',
      caption: 'Ballet class finale — Pepper and Briar nailed the recital warm-up. 🩰',
    },
    {
      _id: newId(),
      date: '2026-10-02',
      imageUrl: 'https://picsum.photos/seed/lego/600/400',
      caption: "Wyatt's Omaha Beach Lego diorama is coming together, one brick at a time.",
    },
    {
      _id: newId(),
      date: '2026-09-30',
      imageUrl: 'https://picsum.photos/seed/backyard/600/400',
      caption: 'Backyard golden hour — a quick round of tag with the kids before dinner.',
    },
    {
      _id: newId(),
      date: '2026-09-28',
      imageUrl: 'https://picsum.photos/seed/piano/600/400',
      caption: "Pepper's piano practice is starting to sound like real music. 🎹",
    },
    {
      _id: newId(),
      date: '2026-09-26',
      imageUrl: 'https://picsum.photos/seed/kitten/600/400',
      caption: 'Briar insists the kitten needed a Hello Kitty blanket. She is right.',
    },
    {
      _id: newId(),
      date: '2026-09-24',
      imageUrl: 'https://picsum.photos/seed/sunset/600/400',
      caption: 'Sunday sunset, porch swing, nowhere else to be. — Philip & Jessica',
    },
  ];
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return clone(JSON.parse(raw));
  } catch {
    // storage unavailable or corrupt — fall through to seeding
  }
  const seeded = seedData();
  writeStore(seeded);
  return clone(seeded);
}

function writeStore(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable — demo data lives in memory for this session only
  }
}

function notFound() {
  throw Object.assign(new Error('Photo not found'), { status: 404 });
}

export function handleDemoRequest(method, path, body) {
  // Never throw 401 in demo mode — no family key is required.
  const route = String(path || '').split('?')[0].replace(/^\/api/, '');
  const match = route.match(/^\/photos(?:\/([^/]+))?$/);
  if (!match) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }
  const id = match[1];

  const m = String(method || 'GET').toUpperCase();

  if (m === 'GET' && !id) {
    const list = readStore().sort((a, b) => (a.date < b.date ? 1 : -1));
    return clone(list);
  }

  if (m === 'POST' && !id) {
    const list = readStore();
    const doc = {
      _id: newId(),
      date: body && body.date,
      imageUrl: body && body.imageUrl,
      caption: body && body.caption,
    };
    list.push(doc);
    writeStore(list);
    return clone(doc);
  }

  if (!id) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }

  if (m === 'PUT') {
    const list = readStore();
    const idx = list.findIndex((p) => p._id === id);
    if (idx === -1) notFound();
    list[idx] = {
      ...list[idx],
      date: body && body.date,
      imageUrl: body && body.imageUrl,
      caption: body && body.caption,
    };
    writeStore(list);
    return clone(list[idx]);
  }

  if (m === 'DELETE') {
    const list = readStore();
    const idx = list.findIndex((p) => p._id === id);
    if (idx === -1) notFound();
    list.splice(idx, 1);
    writeStore(list);
    return { ok: true };
  }

  throw Object.assign(new Error('Method not allowed'), { status: 405 });
}
