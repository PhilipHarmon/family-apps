const express = require('express');
const mongoose = require('mongoose');
const { Recipe, Week, RECIPE_DIFFICULTIES } = require('../models');
const { SEED_RECIPES } = require('../seeds');

const router = express.Router();

// --- Recipes -------------------------------------------------------
// Family Hub v20 (2026-11-03): this router's recipe endpoints are
// now BOTH the Dinner Menu app's library (unchanged legacy fields:
// name/time/ingredients/steps/tip/favorite/notes) AND the Hub
// cookbook's storage (title/sourceUrl/sourceName/prepMinutes/
// cookMinutes/difficulty/description/instructions/imageUrl).
// One collection, two vocabularies, kept in sync here:
//   title        === name
//   instructions === steps joined with '\n' (and split back on write)
// Auth is unchanged: server.js gates every /api route behind the
// shared FAMILY_KEY middleware (x-family-key header) before this
// router runs — no key (or a wrong one) is 401 before reaching here.
//
// Endpoints:
//   GET    /recipes[?search=]  list, sorted by name; ?search= is a
//                              case-insensitive substring on title/name
//   GET    /recipes/:id        one recipe (404 when absent)
//   POST   /recipes            create (title or name required -> 400)
//   POST   /recipes/seed       legacy seed-if-empty (unchanged)
//   PUT    /recipes/:id        full-ish update (any subset accepted;
//                              title/name required if the title is sent)
//   DELETE /recipes/:id        delete (404 when absent)

function serializeRecipe(r) {
  const steps = Array.isArray(r.steps) ? r.steps : [];
  const instructions = r.instructions || steps.join('\n');
  return {
    _id: r._id,
    id: r._id.toString(),
    name: r.name,
    title: r.name,
    time: r.time || '',
    sourceUrl: r.sourceUrl || '',
    sourceName: r.sourceName || '',
    prepMinutes: r.prepMinutes ?? null,
    cookMinutes: r.cookMinutes ?? null,
    difficulty: r.difficulty || '',
    description: r.description || '',
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps,
    instructions,
    tip: r.tip || '',
    favorite: !!r.favorite,
    notes: r.notes || '',
    imageUrl: r.imageUrl || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function cleanMinutes(v, label) {
  if (v === undefined || v === null || v === '') return { value: undefined };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 10080) return { error: `${label} must be a number of minutes (0-10080).` };
  return { value: Math.round(n) };
}

// Normalise an incoming recipe body (either vocabulary) into storage
// fields. Returns { value } or { error } (the route sends 400).
function cleanRecipeInput(body, { requireTitle = true } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const value = {};
  const title = input.title !== undefined ? input.title : input.name;
  if (title !== undefined || requireTitle) {
    if (typeof title !== 'string' || !title.trim()) return { error: 'A recipe needs a title.' };
    if (title.trim().length > 200) return { error: 'Title is too long (max 200 characters).' };
    value.name = title.trim();
  }
  for (const [field, max] of [['time', 80], ['sourceUrl', 1000], ['sourceName', 120], ['description', 2000], ['tip', 1000], ['notes', 2000], ['imageUrl', 1000]]) {
    if (input[field] !== undefined) {
      if (input[field] !== null && typeof input[field] !== 'string') return { error: `${field} must be text.` };
      value[field] = (input[field] || '').trim().slice(0, max);
    }
  }
  if (input.difficulty !== undefined) {
    const d = (input.difficulty || '').trim();
    if (d && !RECIPE_DIFFICULTIES.includes(d)) {
      return { error: `Difficulty must be one of: ${RECIPE_DIFFICULTIES.join(', ')}.` };
    }
    value.difficulty = d;
  }
  for (const field of ['prepMinutes', 'cookMinutes']) {
    if (input[field] !== undefined) {
      const r = cleanMinutes(input[field], field);
      if (r.error) return r;
      value[field] = r.value === undefined ? null : r.value;
    }
  }
  if (input.ingredients !== undefined) {
    if (!Array.isArray(input.ingredients) || input.ingredients.some((i) => typeof i !== 'string')) {
      return { error: 'Ingredients must be a list of text lines.' };
    }
    value.ingredients = input.ingredients.map((i) => i.trim()).filter(Boolean).slice(0, 200);
  }
  // instructions (string) and steps (array) are two spellings of the
  // same content — accept either, store both.
  if (input.instructions !== undefined && typeof input.instructions === 'string') {
    value.instructions = input.instructions;
    value.steps = input.instructions.split('\n').map((s) => s.trim()).filter(Boolean);
  } else if (input.steps !== undefined) {
    if (!Array.isArray(input.steps) || input.steps.some((s) => typeof s !== 'string')) {
      return { error: 'Steps must be a list of text lines.' };
    }
    value.steps = input.steps.map((s) => s.trim()).filter(Boolean);
    value.instructions = value.steps.join('\n');
  }
  if (input.favorite !== undefined) {
    if (typeof input.favorite !== 'boolean') return { error: 'Favorite must be true or false.' };
    value.favorite = input.favorite;
  }
  return { value };
}

router.get('/recipes', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const filter = search ? { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {};
    const recipes = await Recipe.find(filter).sort({ name: 1 });
    res.json(recipes.map(serializeRecipe));
  } catch (err) {
    next(err);
  }
});

router.get('/recipes/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Recipe not found' });
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    return res.json(serializeRecipe(recipe));
  } catch (err) {
    return next(err);
  }
});

router.post('/recipes', async (req, res, next) => {
  try {
    const cleaned = cleanRecipeInput(req.body, { requireTitle: true });
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const recipe = await Recipe.create(cleaned.value);
    return res.status(201).json(serializeRecipe(recipe));
  } catch (err) {
    return next(err);
  }
});

router.post('/recipes/seed', async (_req, res, next) => {
  try {
    if ((await Recipe.countDocuments()) > 0) {
      return res.json({ seeded: 0, note: 'Collection already has recipes; nothing seeded.' });
    }
    const docs = await Recipe.insertMany(SEED_RECIPES);
    return res.json({ seeded: docs.length });
  } catch (err) {
    return next(err);
  }
});

router.put('/recipes/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Recipe not found' });
    // A PUT that carries a title must carry a non-empty one; a PUT
    // without a title is a partial update (e.g. the favorite toggle
    // the Dinner Menu app already sends).
    const hasTitle = req.body && (req.body.title !== undefined || req.body.name !== undefined);
    const cleaned = cleanRecipeInput(req.body, { requireTitle: false });
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    if (hasTitle && !cleaned.value.name) return res.status(400).json({ error: 'A recipe needs a title.' });
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, cleaned.value, { new: true, runValidators: true });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    return res.json(serializeRecipe(recipe));
  } catch (err) {
    return next(err);
  }
});

router.delete('/recipes/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Recipe not found' });
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
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
