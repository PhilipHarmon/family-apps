const express = require('express');
const { Question, Game } = require('../models');
const { SEED_QUESTIONS } = require('../seeds');

const router = express.Router();

// --- Questions ---
router.get('/questions', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.tier && ['easy', 'medium', 'hard'].includes(req.query.tier)) {
      filter.tier = req.query.tier;
    }
    res.json(await Question.find(filter));
  } catch (err) {
    next(err);
  }
});

router.post('/questions', async (req, res, next) => {
  try {
    const { text, answer, tier, topic } = req.body || {};
    const q = await Question.create({ text, answer, tier, topic });
    res.status(201).json(q);
  } catch (err) {
    next(err);
  }
});

router.post('/questions/seed', async (_req, res, next) => {
  try {
    if ((await Question.countDocuments()) > 0) {
      return res.json({ seeded: 0, note: 'Collection already has questions; nothing seeded.' });
    }
    const docs = await Question.insertMany(SEED_QUESTIONS);
    res.json({ seeded: docs.length });
  } catch (err) {
    next(err);
  }
});

// Bulk import: POST { questions: [{ text, answer, tier, topic }] }.
// Skips entries that already exist with identical text (case-insensitive).
router.post('/questions/bulk', async (req, res, next) => {
  try {
    const list = (req.body && req.body.questions) || [];
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ error: 'Provide a non-empty "questions" array.' });
    }
    const validTiers = ['easy', 'medium', 'hard'];
    const cleaned = list
      .filter(
        (q) =>
          q &&
          typeof q.text === 'string' &&
          q.text.trim() &&
          typeof q.answer === 'string' &&
          q.answer.trim() &&
          validTiers.includes(q.tier),
      )
      .map((q) => ({
        text: q.text.trim(),
        answer: q.answer.trim(),
        tier: q.tier,
        topic: typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : 'Imported Pack',
      }));
    if (cleaned.length === 0) {
      return res.status(400).json({ error: 'No valid questions found. Each needs text, answer, and a tier (easy/medium/hard).' });
    }
    const existing = await Question.find(
      { text: { $in: cleaned.map((q) => new RegExp(`^${q.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } },
      { text: 1 },
    ).lean();
    const seen = new Set(existing.map((q) => q.text.toLowerCase()));
    const fresh = cleaned.filter((q) => {
      const key = q.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const docs = fresh.length ? await Question.insertMany(fresh) : [];
    res.status(201).json({ imported: docs.length, skipped: cleaned.length - fresh.length });
  } catch (err) {
    next(err);
  }
});

// --- Games ---
router.get('/games', async (_req, res, next) => {
  try {
    res.json(await Game.find().sort({ _id: -1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/games', async (req, res, next) => {
  try {
    const { date, players, rounds, winner } = req.body || {};
    const game = await Game.create({ date, players, rounds, winner });
    res.status(201).json(game);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
