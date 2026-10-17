/* Demo-mode API backend for the song-book app.
 *
 * When ?demo=1 is in the URL, every API call is intercepted and served from
 * warm sample data persisted in localStorage under 'demoData:song-book'.
 * Demo mode NEVER touches the real family server and NEVER requires a
 * family key. The seed song is "The Harmon Family Band" (composed).
 */

const STORE_KEY = 'demoData:song-book';

function newId() {
  return 'demo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

const DEMO_SONG_SEED = {
  _id: 'demo-song-harmon-family-band',
  title: 'The Harmon Family Band',
  idea: 'A silly song about our whole family forming a one-night-only band — Dad on guitar, Wyatt on pots and pans, Pepper on shakers, Briar on the drum.',
  style: 'Silly',
  tempo: 112,
  status: 'composed',
  lyricsSections: [
    {
      label: 'Verse 1',
      lines: [
        'Dad tuned up his guitar on a Friday night',
        'Wyatt grabbed the pots and held them up high',
        'Pepper shook the shakers with a rattle and a roll',
        'Briar hit the drum and played it with her soul',
      ],
    },
    {
      label: 'Chorus',
      lines: [
        'We are the Harmon Family Band!',
        'Clap your hands and stomp your feet!',
        'Pots and pans and guitar strings!',
        "We're the loudest band on the street!",
      ],
    },
    {
      label: 'Verse 2',
      lines: [
        'Mom grabbed her phone to film the big debut',
        'The dog howled loud, he wanted in too',
        'Neighbors peeked out to hear that happy sound',
        'We played so loud we shook the whole house down',
      ],
    },
    {
      label: 'Chorus',
      lines: [
        'We are the Harmon Family Band!',
        'Clap your hands and stomp your feet!',
        'Pots and pans and guitar strings!',
        "We're the loudest band on the street!",
      ],
    },
    {
      label: 'Outro',
      lines: [
        'Take a bow now, the show is done!',
        'The Harmon Family Band was number one!',
      ],
    },
  ],
  chords: [
    { section: 'Verse', progression: 'C – F – G – F' },
    { section: 'Chorus', progression: 'C – G – Am – F' },
    { section: 'Outro', progression: 'F – G – C' },
  ],
  guitarTab: [
    'STRUMMING: D - DU - UDU   (D = down-strum, U = up-strum)',
    'Keep it loose and LOUD — this is a pots-and-pans band!',
    '',
    'VERSE — one chord per line, 2 bars each:',
    'Dad tuned up his guitar on a Friday night  | C |',
    'Wyatt grabbed the pots and held them up high | F |',
    'Pepper shook the shakers with a rattle...   | G |',
    'Briar hit the drum and played it...         | F |',
    '',
    'CHORUS — sing it BIG:',
    'We are the Harmon Family Band!  | C  |',
    'Clap your hands and stomp...    | G  |',
    'Pots and pans and guitar...     | Am |',
    "We're the loudest band...       | F  |",
    '',
    'OUTRO:',
    'Take a bow now, the show is done!            | F |',
    'The Harmon Family Band was number one!  | G -> C | (end on C, let it ring!)',
    '',
    'DAD TIP: F is the tricky one. If your fingers protest,',
    'play Fmaj7 (x-x-3-2-1-1) instead — nobody in this band will mind.',
  ].join('\n'),
  bassTab: [
    'BASS — root notes, one pluck per beat (8 hits per line, 2 bars).',
    'Use your index finger. Easy frets, no stretches!',
    '',
    'C  = A string, 3rd fret      F  = D string, 3rd fret',
    'G  = E string, 3rd fret      Am = A string, open',
    '',
    'VERSE 1 & 2 — play each block, then move to the next chord:',
    'C:',
    'G |--------------------------------|',
    'D |--------------------------------|',
    'A |--3---3---3---3---3---3---3---3--|',
    'E |--------------------------------|',
    'F:',
    'G |--------------------------------|',
    'D |--3---3---3---3---3---3---3---3--|',
    'A |--------------------------------|',
    'E |--------------------------------|',
    'G:',
    'G |--------------------------------|',
    'D |--------------------------------|',
    'A |--------------------------------|',
    'E |--3---3---3---3---3---3---3---3--|',
    'F: (same as above)',
    '',
    'CHORUS — same idea: C, G, Am, F. Am looks like this:',
    'G |--------------------------------|',
    'D |--------------------------------|',
    'A |--0---0---0---0---0---0---0---0--|',
    'E |--------------------------------|',
    '',
    'OUTRO: F, G, then C — end on C and let it RING!',
  ].join('\n'),
  pianoScore: [
    'RIGHT HAND (melody) — play and sing along. Middle C = C4.',
    "Apostrophe (') means the higher octave, e.g. D' = D5.",
    '',
    'VERSE 1',
    'E  G  A  G  | E  D  C --        (C)',
    'Dad tuned up his guitar on a Friday night',
    '',
    'F  A  G  F  | E  D  C --        (F)',
    'Wyatt grabbed the pots and held them up high',
    '',
    "D  G  B  D' | B  A  G --        (G)",
    'Pepper shook the shakers with a rattle and a roll',
    '',
    'A  G  F  E  | D  E  F --        (F)',
    'Briar hit the drum and played it with her soul',
    '',
    'CHORUS — big and chanty!',
    'G  A  G  E  | D  E  C --        (C)',
    'We are the Harmon Family Band!',
    '',
    'D  G  B  A  | G  E  D --        (G)',
    'Clap your hands and stomp your feet!',
    '',
    "A  C' B  A  | G  E  A --        (Am)",
    'Pots and pans and guitar strings!',
    '',
    'F  A  G  F  | E  D  C --        (F)',
    "We're the loudest band on the street!",
    '',
    'VERSE 2 (same chords as Verse 1: C - F - G - F)',
    'E  G  E  D  | E  G  A --',
    'Mom grabbed her phone to film the big debut',
    '',
    'F  F  E  D  | C  D  E --',
    'The dog howled loud, he wanted in too',
    '',
    "G  A  B  D' | B  A  G --",
    'Neighbors peeked out to hear that happy sound',
    '',
    "A  G  A  C' | A  G  F --",
    'We played so loud we shook the whole house down',
    '',
    'OUTRO',
    'F  E  D  C  | D  E  F --        (F)',
    'Take a bow now, the show is done!',
    '',
    'D  E  G  A  | G  E  D  C       (G -> C)',
    'The Harmon Family Band was number one!',
    '',
    'LEFT HAND — easy version: play the root note on beat 1 of',
    'every bar, low and steady. C2 ... F2 ... G2 ... A2.',
    'Fancy version: root on beat 1, full 3-note chord on beat 3.',
  ].join('\n'),
  midiData: 'TVRoZAAAAAYAAQADAeBNVHJrAAAEfwDAAI8AkEBcg2CAQAAAkENcg2CAQwAAkEVcg2CARQAAkENcg2CAQwAAkEBcg2CAQAAAkD5cg2CAPgAAkDxch0CAPAAAkEFcg2CAQQAAkEVcg2CARQAAkENcg2CAQwAAkEFcg2CAQQAAkEBcg2CAQAAAkD5cg2CAPgAAkDxch0CAPAAAkD5cg2CAPgAAkENcg2CAQwAAkEdcg2CARwAAkEpcg2CASgAAkEdcg2CARwAAkEVcg2CARQAAkENch0CAQwAAkEVcg2CARQAAkENcg2CAQwAAkEFcg2CAQQAAkEBcg2CAQAAAkD5cg2CAPgAAkEBcg2CAQAAAkEFch0CAQQAAkENcg2CAQwAAkEVcg2CARQAAkENcg2CAQwAAkEBcg2CAQAAAkD5cg2CAPgAAkEBcg2CAQAAAkDxch0CAPAAAkD5cg2CAPgAAkENcg2CAQwAAkEdcg2CARwAAkEVcg2CARQAAkENcg2CAQwAAkEBcg2CAQAAAkD5ch0CAPgAAkEVcg2CARQAAkEhcg2CASAAAkEdcg2CARwAAkEVcg2CARQAAkENcg2CAQwAAkEBcg2CAQAAAkEVch0CARQAAkEFcg2CAQQAAkEVcg2CARQAAkENcg2CAQwAAkEFcg2CAQQAAkEBcg2CAQAAAkD5cg2CAPgAAkDxch0CAPAAAkEBcg2CAQAAAkENcg2CAQwAAkEBcg2CAQAAAkD5cg2CAPgAAkEBcg2CAQAAAkENcg2CAQwAAkEVch0CARQAAkEFcg2CAQQAAkEFcg2CAQQAAkEBcg2CAQAAAkD5cg2CAPgAAkDxcg2CAPAAAkD5cg2CAPgAAkEBch0CAQAAAkENcg2CAQwAAkEVcg2CARQAAkEdcg2CARwAAkEpcg2CASgAAkEdcg2CARwAAkEVcg2CARQAAkENch0CAQwAAkEVcg2CARQAAkENcg2CAQwAAkEVcg2CARQAAkEhcg2CASAAAkEVcg2CARQAAkENcg2CAQwAAkEFch0CAQQAAkENcg2CAQwAAkEVcg2CARQAAkENcg2CAQwAAkEBcg2CAQAAAkD5cg2CAPgAAkEBcg2CAQAAAkDxch0CAPAAAkD5cg2CAPgAAkENcg2CAQwAAkEdcg2CARwAAkEVcg2CARQAAkENcg2CAQwAAkEBcg2CAQAAA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AAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkZAAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4mSRfACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJGQAKjcAMW54iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAeJkkXwAqN3iJJAAAKgB4mSo3eIkqAHiZKGQAKjd4iSgAACoAeJkqN3iJKgB4MQAAmSRkACo3eIkkAAAqAHiZKjd4iSoAeJkoZAAqN3iJKAAAKgB4mSo3eIkqAHiZJF8AKjd4iSQAACoAeJkqN3iJKgB4mShkACo3eIkoAAAqAHiZKjd4iSoAAP8vAA==',
  sunoPrompt:
    'Silly family pop song, upbeat 112 BPM, acoustic guitar strumming, handclaps, pots-and-pans percussion, playful dad vocal on the verses, kids choir chanting the chorus big and loud, joyful and goofy',
  recordings: [],
};

function seedStore() {
  return { songs: [clone(DEMO_SONG_SEED)] };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupted or unavailable — reseed */
  }
  const fresh = seedStore();
  save(fresh);
  return fresh;
}

function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    /* storage full/blocked — demo continues in-memory only */
  }
}

function notFound(what) {
  const e = new Error(`${what} not found`);
  e.status = 404;
  return e;
}

const SONG_FIELDS = [
  'title', 'idea', 'style', 'tempo', 'status', 'lyricsSections', 'chords',
  'guitarTab', 'bassTab', 'pianoScore', 'midiData', 'sunoPrompt', 'recordings',
];

export function handleDemoRequest(method, path, body) {
  let clean = String(path || '').split('?')[0];
  if (clean.startsWith('/api')) clean = clean.slice(4) || '/';

  const data = load();

  if (method === 'GET' && clean === '/songs') {
    return clone(data.songs);
  }

  if (method === 'POST' && clean === '/songs') {
    const { title, idea, style, tempo } = body || {};
    const song = {
      _id: newId(),
      title: String(title || 'Untitled song').slice(0, 120),
      idea: String(idea || '').slice(0, 2000),
      style: String(style || '').slice(0, 40),
      tempo: Number(tempo) || null,
      status: 'idea',
      lyricsSections: [],
      chords: [],
      guitarTab: '',
      bassTab: '',
      pianoScore: '',
      midiData: '',
      sunoPrompt: '',
      recordings: [],
    };
    data.songs.unshift(song);
    save(data);
    return clone(song);
  }

  if (method === 'POST' && clean === '/songs/seed') {
    if (data.songs.length > 0) return { seeded: 0 };
    const fresh = seedStore();
    data.songs = fresh.songs;
    save(data);
    return { seeded: data.songs.length };
  }

  if (clean.startsWith('/songs/')) {
    const id = clean.slice('/songs/'.length);
    const song = data.songs.find((s) => s._id === id);
    if (!song) throw notFound('Song');

    if (method === 'GET') return clone(song);

    if (method === 'PUT') {
      for (const key of SONG_FIELDS) {
        if (body && body[key] !== undefined) song[key] = body[key];
      }
      save(data);
      return clone(song);
    }

    if (method === 'DELETE') {
      data.songs = data.songs.filter((s) => s._id !== id);
      save(data);
      return { deleted: true };
    }
  }

  const e = new Error(`Demo mode has no handler for ${method} ${clean}`);
  e.status = 404;
  throw e;
}
