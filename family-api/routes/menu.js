const express = require('express');
const { Recipe, Week } = require('../models');
const { SEED_RECIPES } = require('../seeds');

const router = express.Router();

// --- Recipes ---
router.get('/recipes', async (_req, res, next) => {
  try {
    res.json(await Recipe.find().sort({ name: 1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/recipes', async (req, res, next) => {
  try {
    const { name, time, ingredients, steps, tip } = req.body || {};
    const recipe = await Recipe.create({ name, time, ingredients, steps, tip });
    res.status(201).json(recipe);
  } catch (err) {
    next(err);
  }
});

router.post('/recipes/seed', async (_req, res, next) => {
  try {
    if ((await Recipe.countDocuments()) > 0) {
      return res.json({ seeded: 0, note: 'Collection already has recipes; nothing seeded.' });
    }
    const docs = await Recipe.insertMany(SEED_RECIPES);
    res.json({ seeded: docs.length });
  } catch (err) {
    next(err);
  }
});

// --- Week plan (single shared doc) ---
const EMPTY_DAYS = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };

async function getOrCreateWeek() {
  let week = await Week.findOne();
  if (!week) {
    week = await Week.create({ days: EMPTY_DAYS });
  }
  return week;
}

router.get('/week', async (_req, res, next) => {
  try {
    res.json(await getOrCreateWeek());
  } catch (err) {
    next(err);
  }
});

router.put('/week', async (req, res, next) => {
  try {
    const week = await getOrCreateWeek();
    week.days = (req.body && req.body.days) || EMPTY_DAYS;
    await week.save();
    res.json(week);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
