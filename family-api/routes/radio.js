const express = require('express');
const { RadioEpisode } = require('../models/RadioEpisode');

const router = express.Router();

// --- Harmon Radio shelf ----------------------------------------------
// Episodes of "Harmon Radio" (Saturday Morning Family Radio), one
// document per episode, created when a new show is produced and
// listed for the Fridge Door's radio player. Episodes are keepsakes
// here like the storybooks: they are saved, listed, read back and
// deleted — never edited by the API.
// Auth is unchanged: server.js gates every /api route behind the
// shared FAMILY_KEY middleware (x-family-key header) before this
// router runs. Deleting an episode is an adults-only action in the
// product, but that rule is enforced HUB-side (the Hub bridge knows
// who is asking; this API only ever sees the family key) — do not
// grow a second auth model here.
//
// Endpoints:
//   POST   /radio/episodes        add an episode (201)
//   GET    /radio/episodes        the shelf, newest first — FULL
//                                 fields: the list is small and the
//                                 Hub player needs audioUrl and
//                                 description right there
//   GET    /radio/episodes/:id    one full episode
//   DELETE /radio/episodes/:id    remove an episode

function serializeEpisode(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    date: doc.date || '',
    audioUrl: doc.audioUrl,
    durationSec: doc.durationSec || 0,
    description: doc.description || '',
    createdBy: doc.createdBy || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// Normalise an incoming episode body. Returns { value } or { error }
// (the route sends 400). Validation is deliberately minimal — an
// episode needs a title and somewhere to stream from; everything
// else defaults — but the shelf never stores a shapeless episode.
function cleanEpisodeInput(body) {
  const input = body && typeof body === 'object' ? body : {};
  if (typeof input.title !== 'string' || !input.title.trim()) {
    return { error: 'An episode needs a title.' };
  }
  if (typeof input.audioUrl !== 'string' || !input.audioUrl.trim()) {
    return { error: 'An episode needs an audio URL.' };
  }
  return {
    value: {
      title: input.title.trim(),
      date: typeof input.date === 'string' ? input.date : '',
      audioUrl: input.audioUrl.trim(),
      durationSec:
        typeof input.durationSec === 'number' && Number.isFinite(input.durationSec)
          ? input.durationSec
          : 0,
      description: typeof input.description === 'string' ? input.description : '',
      createdBy: typeof input.createdBy === 'string' ? input.createdBy : '',
    },
  };
}

router.post('/radio/episodes', async (req, res, next) => {
  try {
    const cleaned = cleanEpisodeInput(req.body);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const doc = await RadioEpisode.create(cleaned.value);
    return res.status(201).json(serializeEpisode(doc));
  } catch (err) {
    return next(err);
  }
});

router.get('/radio/episodes', async (_req, res, next) => {
  try {
    const docs = await RadioEpisode.find().sort({ date: -1, createdAt: -1, _id: -1 });
    return res.json({ episodes: docs.map(serializeEpisode) });
  } catch (err) {
    return next(err);
  }
});

router.get('/radio/episodes/:id', async (req, res, next) => {
  try {
    const doc = await RadioEpisode.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ error: 'Episode not found' });
    return res.json(serializeEpisode(doc));
  } catch (err) {
    return next(err);
  }
});

router.delete('/radio/episodes/:id', async (req, res, next) => {
  try {
    const doc = await RadioEpisode.findByIdAndDelete(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ error: 'Episode not found' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
