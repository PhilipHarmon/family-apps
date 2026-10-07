// Demo-mode data layer for Trivia Night.
// Intercepts API calls when ?demo=1 is active and serves warm sample data
// from localStorage. Never touches the real family API and never needs the
// family key.

const STORE_KEY = 'demoData:trivia-night';

function makeId() {
  return 'demo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seedQuestions() {
  return [
    // --- Easy: answerable by a 5-year-old (Briar's league) ---
    { _id: makeId(), text: 'What kind of animal is Bluey?', answer: 'A dog (a Blue Heeler!)', tier: 'easy', topic: 'Bluey' },
    { _id: makeId(), text: "What is Bluey's little sister called?", answer: 'Bingo', tier: 'easy', topic: 'Bluey' },
    { _id: makeId(), text: 'What animal is Hello Kitty?', answer: 'A cat', tier: 'easy', topic: 'Hello Kitty' },
    { _id: makeId(), text: 'What color do you get when you mix blue and yellow?', answer: 'Green', tier: 'easy', topic: 'Colors' },
    // --- Medium: 8-10-year-olds (Wyatt & Pepper's league) ---
    { _id: makeId(), text: 'What are the little round bumps on top of Lego bricks called?', answer: 'Studs', tier: 'medium', topic: 'Lego' },
    { _id: makeId(), text: "Who sings 'Shake It Off'?", answer: 'Taylor Swift', tier: 'medium', topic: 'Taylor Swift' },
    { _id: makeId(), text: 'Which planet is known as the Red Planet?', answer: 'Mars', tier: 'medium', topic: 'Science' },
    { _id: makeId(), text: 'In what year did World War II end?', answer: '1945', tier: 'medium', topic: 'WWII History' },
    // --- Hard: grown-ups (Philip & Jessica's league) ---
    { _id: makeId(), text: "In 'The Princess Bride', what does Inigo Montoya say before every duel?", answer: 'Hello. My name is Inigo Montoya. You killed my father. Prepare to die.', tier: 'hard', topic: '80s Movies' },
    { _id: makeId(), text: "In 'Back to the Future', how fast must the DeLorean go to travel through time?", answer: '88 miles per hour', tier: 'hard', topic: '80s Movies' },
    { _id: makeId(), text: 'Jimmy Buffett sang about wasting away in which fictional tropical place?', answer: 'Margaritaville', tier: 'hard', topic: 'Music' },
    { _id: makeId(), text: "Which Vermont jam band is one of Philip's all-time favorites?", answer: 'Phish', tier: 'hard', topic: 'Music' },
  ];
}

function seedGames() {
  return [
    {
      _id: makeId(),
      date: '2026-09-27T00:30:00.000Z',
      players: [
        { name: 'Wyatt', score: 14 },
        { name: 'Philip', score: 11 },
        { name: 'Jessica', score: 10 },
        { name: 'Pepper', score: 8 },
        { name: 'Briar', score: 5 },
      ],
      rounds: 3,
      winner: 'Wyatt',
    },
  ];
}

function loadStore() {
  let store = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) store = JSON.parse(raw);
  } catch {
    store = null;
  }
  if (!store || !Array.isArray(store.questions) || !Array.isArray(store.games)) {
    store = { questions: [], games: [] };
  }
  return store;
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function notFound(thing) {
  throw Object.assign(new Error(`${thing} not found`), { status: 404 });
}

// Route a demo API call. `method` is the HTTP verb, `path` may include a
// query string and/or a leading /api, `body` is the parsed request payload
// (or undefined for GETs).
export function handleDemoRequest(method, path, body) {
  // Normalize: split off the query string for routing (but honor it),
  // and strip a leading /api if present.
  const [rawPath, queryString = ''] = String(path).split('?');
  const query = new URLSearchParams(queryString);
  let route = rawPath || '/';
  if (route.startsWith('/api')) route = route.slice(4) || '/';

  const store = loadStore();

  // --- Questions ---
  if (route === '/questions' && method === 'GET') {
    const tier = query.get('tier');
    const list = tier ? store.questions.filter((q) => q.tier === tier) : store.questions;
    return clone(list);
  }

  if (route === '/questions' && method === 'POST') {
    const payload = body && typeof body === 'object' ? body : {};
    const doc = {
      _id: makeId(),
      text: payload.text ?? '',
      answer: payload.answer ?? '',
      tier: payload.tier ?? 'medium',
      topic: payload.topic ?? '',
    };
    store.questions.push(doc);
    saveStore(store);
    return clone(doc);
  }

  if (route === '/questions/seed' && method === 'POST') {
    if (store.questions.length === 0) {
      store.questions = seedQuestions();
      saveStore(store);
      return { seeded: store.questions.length };
    }
    return { seeded: 0 };
  }

  // --- Games ---
  if (route === '/games' && method === 'GET') {
    return clone([...store.games].reverse());
  }

  if (route === '/games' && method === 'POST') {
    const payload = body && typeof body === 'object' ? body : {};
    const doc = {
      _id: makeId(),
      date: payload.date ?? new Date().toISOString(),
      players: Array.isArray(payload.players) ? payload.players : [],
      rounds: payload.rounds ?? 0,
      winner: payload.winner ?? '',
    };
    store.games.push(doc);
    saveStore(store);
    return clone(doc);
  }

  notFound('Demo endpoint');
}
