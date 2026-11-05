const express = require('express');
const { Story, SEED_STORY } = require('../models');

const router = express.Router();

function cleanPassages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p) => ({
      teller: String((p && p.teller) || '').slice(0, 40),
      text: String((p && p.text) || '').slice(0, 4000),
      round: Number.isFinite(Number(p && p.round)) ? Number(p.round) : 1,
      audioUrl: String((p && p.audioUrl) || '').slice(0, 2000000),
    }))
    .filter((p) => p.teller && (p.text || p.audioUrl));
}

// --- Stories ---
router.get('/stories', async (_req, res, next) => {
  try {
    res.json(await Story.find().sort({ createdAt: -1, _id: -1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/stories', async (req, res, next) => {
  try {
    const { title, tellers, passages } = req.body || {};
    const story = await Story.create({
      title: String(title || '').slice(0, 80) || 'Untitled story',
      tellers: Array.isArray(tellers) ? tellers.map((t) => String(t).slice(0, 40)).filter(Boolean) : [],
      passages: cleanPassages(passages),
    });
    res.status(201).json(story);
  } catch (err) {
    next(err);
  }
});

router.post('/stories/seed', async (_req, res, next) => {
  try {
    if ((await Story.countDocuments()) > 0) {
      return res.json({ seeded: 0, note: 'Collection already has stories; nothing seeded.' });
    }
    const doc = await Story.create(SEED_STORY);
    res.json({ seeded: 1, id: doc._id });
  } catch (err) {
    next(err);
  }
});

router.get('/stories/:id', async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (err) {
    next(err);
  }
});

router.put('/stories/:id', async (req, res, next) => {
  try {
    const { title, tellers, passages } = req.body || {};
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      {
        ...(title !== undefined ? { title: String(title).slice(0, 80) } : {}),
        ...(tellers !== undefined
          ? { tellers: tellers.map((t) => String(t).slice(0, 40)).filter(Boolean) }
          : {}),
        ...(passages !== undefined ? { passages: cleanPassages(passages) } : {}),
      },
      { new: true }
    );
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (err) {
    next(err);
  }
});

router.delete('/stories/:id', async (req, res, next) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
