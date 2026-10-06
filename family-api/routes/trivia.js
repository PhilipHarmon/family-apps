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
