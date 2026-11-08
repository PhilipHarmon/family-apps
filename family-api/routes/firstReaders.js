const express = require('express');
const requireKey = require('../middleware/requireKey');
const { FirstReaderNote } = require('../models/FirstReaderNote');

const router = express.Router();

// --- First Readers notes ---------------------------------------------
// Chapter notes from the invited readers of "Let Sleeping Beagles Lay"
// (the First Readers static app). Readers are members of the public
// with a shared reader code — they do NOT have the family key — so,
// like the TV rooms router, this router mounts in server.js BEFORE
// the global family-key gate and carries its own auth per route:
//
//   POST /first-readers/notes   public, but the body must carry the
//                               shared reader code (`readerCode`),
//                               checked against the FIRST_READERS_CODE
//                               env var (default 'BEAGLE-READS' — set
//                               it on Render to the same value as the
//                               app's src/config.js READER_CODE).
//   GET  /first-readers/notes   the author dashboard's read; carries
//                               requireKey (x-family-key header),
//                               exactly like every other family-api
//                               read.
//
// A record with empty text fields and pulse null is a finish marker
// (the reader tapped "I finished this chapter" and left no note) —
// stored in the same shape so progress counting needs no second
// collection. Notes are append-only: no update or delete routes.

const READER_CODE = process.env.FIRST_READERS_CODE || 'BEAGLE-READS';
const CHAPTER_IDS = new Set([
  'prologue',
  ...Array.from({ length: 10 }, (_, i) => `chapter-${i + 1}`),
]);
const MAX_FIELD = 4000; // generous for a note, a wall against abuse

function cleanField(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, MAX_FIELD);
}

function serializeNote(doc) {
  return {
    id: doc._id.toString(),
    readerName: doc.readerName,
    chapterId: doc.chapterId,
    worked: doc.worked || '',
    snagged: doc.snagged || '',
    loved: doc.loved || '',
    pulse: typeof doc.pulse === 'number' ? doc.pulse : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.post('/first-readers/notes', async (req, res, next) => {
  try {
    const body = req.body || {};
    if (body.readerCode !== READER_CODE) {
      return res.status(401).json({ error: 'Invalid reader code' });
    }
    const readerName = cleanField(body.readerName);
    if (!readerName) {
      return res.status(400).json({ error: 'readerName is required' });
    }
    if (!CHAPTER_IDS.has(body.chapterId)) {
      return res.status(400).json({ error: 'Unknown chapterId' });
    }
    const worked = cleanField(body.worked);
    const snagged = cleanField(body.snagged);
    const loved = cleanField(body.loved);
    if (worked === null || snagged === null || loved === null) {
      return res.status(400).json({ error: 'Note fields must be strings' });
    }
    let pulse = null;
    if (body.pulse !== undefined && body.pulse !== null && body.pulse !== '') {
      pulse = Number(body.pulse);
      if (!Number.isInteger(pulse) || pulse < 1 || pulse > 5) {
        return res.status(400).json({ error: 'pulse must be an integer 1–5' });
      }
    }
    const doc = await FirstReaderNote.create({
      readerName,
      chapterId: body.chapterId,
      worked,
      snagged,
      loved,
      pulse,
    });
    return res.status(201).json({ note: serializeNote(doc) });
  } catch (err) {
    return next(err);
  }
});

router.get('/first-readers/notes', requireKey, async (_req, res, next) => {
  try {
    const docs = await FirstReaderNote.find({}).sort({ createdAt: 1 }).lean();
    return res.json({ notes: docs.map(serializeNote) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
