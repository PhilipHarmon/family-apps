const express = require('express');
const { Song } = require('../models');

const router = express.Router();

/* ------------------------------------------------------------------ *
 * Demo seed: "The Harmon Family Band"
 * A complete silly family song, composed by Fred: key of C, 112 BPM,
 * verse C-F-G-F, chorus C-G-Am-F. midiData is the base64 of a real
 * .mid file (melody + chord stabs + drums) generated with mido and
 * verified by re-reading before embedding.
 * ------------------------------------------------------------------ */
const DEMO_SONG = {
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
    'VERSE 1 & 2 — play each line below, then move to the next chord:',
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

// --- Songs ---
router.get('/songs', async (_req, res, next) => {
  try {
    res.json(await Song.find().sort({ updatedAt: -1, _id: -1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/songs', async (req, res, next) => {
  try {
    const { title, idea, style, tempo } = req.body || {};
    const song = await Song.create({ title, idea, style, tempo, status: 'idea' });
    res.status(201).json(song);
  } catch (err) {
    next(err);
  }
});

router.get('/songs/:id', async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json(song);
  } catch (err) {
    next(err);
  }
});

router.put('/songs/:id', async (req, res, next) => {
  try {
    const allowed = [
      'title',
      'idea',
      'style',
      'tempo',
      'status',
      'lyricsSections',
      'chords',
      'guitarTab',
      'bassTab',
      'pianoScore',
      'midiData',
      'sunoPrompt',
      'recordings',
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body && req.body[key] !== undefined) update[key] = req.body[key];
    }
    const song = await Song.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json(song);
  } catch (err) {
    next(err);
  }
});

router.delete('/songs/:id', async (req, res, next) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// Download the song's MIDI file: GET /songs/:id/midi -> song-title.mid
router.get('/songs/:id/midi', async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    if (!song.midiData) return res.status(404).json({ error: 'No MIDI for this song yet' });
    const buf = Buffer.from(song.midiData, 'base64');
    const safe = String(song.title || 'song')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    res.set('Content-Type', 'audio/midi');
    res.set('Content-Disposition', `attachment; filename="${safe || 'song'}.mid"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

// Seed the demo song (only when the collection is empty).
router.post('/songs/seed', async (_req, res, next) => {
  try {
    if ((await Song.countDocuments()) > 0) {
      return res.json({ seeded: 0, note: 'Collection already has songs; nothing seeded.' });
    }
    const docs = await Song.insertMany([DEMO_SONG]);
    res.json({ seeded: docs.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
