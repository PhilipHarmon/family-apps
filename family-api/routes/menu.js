const express = require('express');
const mongoose = require('mongoose');
const { Recipe, Week, SuggestionSet, PantryStaples, RECIPE_DIFFICULTIES } = require('../models');
const { SEED_RECIPES } = require('../seeds');
const { DAY_KEYS, isValidWeekStart, currentWeekStart, dateOfDay, todayString } = require('../weeks');
const { DEFAULT_STAPLES, normalizeText, buildShoppingList } = require('../consolidate');

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
//
// Dinner System Phase 1 (2026-11-06) additions:
//   GET    /recipes gains ?tags=a,b (ALL listed tags) and
//          ?difficulty=Easy|Medium|Hard, AND-combined with ?search=;
//          POST/PUT accept `tags` (lowercase slugs).
//   GET    /week, PUT /week    KEPT — aliases over the current week's
//                              dated doc (see the Week section below)
//   GET    /weeks/:weekStart            dated week (found-or-created)
//   PUT    /weeks/:weekStart            wholesale replace of days
//   PUT    /weeks/:weekStart/days/:day  set/clear ONE day
//   GET    /weeks/:weekStart/shopping-list  consolidated list (§8)
//   POST   /suggestion-sets             Fred's authoring path (§5)
//   GET    /suggestion-sets/open        the open set (week not begun)
//   GET    /suggestion-sets/:weekStart  one week's set, items joined
//   GET    /pantry-staples, PUT /pantry-staples   §3.4 singleton
//   GET    /favorites/history           starred + served archive (§7)

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
    tags: Array.isArray(r.tags) ? r.tags : [],
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

// Normalise a tags input (array of strings, or one comma-separated
// string) into lowercase slugs. Returns { value } or { error }.
function cleanTags(input) {
  const list = typeof input === 'string' ? input.split(',') : input;
  if (!Array.isArray(list) || list.some((t) => typeof t !== 'string')) {
    return { error: 'Tags must be a list of text slugs.' };
  }
  const tags = [...new Set(list.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (tags.length > 20) return { error: 'Too many tags (max 20).' };
  if (tags.some((t) => t.length > 40 || !/^[a-z0-9][a-z0-9-]*$/.test(t))) {
    return { error: 'Tags must be lowercase slugs like "crockpot" or "one-pot".' };
  }
  return { value: tags };
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
  if (input.tags !== undefined) {
    const r = cleanTags(input.tags);
    if (r.error) return r;
    value.tags = r.value;
  }
  return { value };
}

router.get('/recipes', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const filter = search ? { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {};
    // Phase 1 filters (spec §3.3): ?tags= is ALL-match and combines
    // with ?search= and ?difficulty= by AND.
    if (typeof req.query.tags === 'string' && req.query.tags.trim()) {
      const cleaned = cleanTags(req.query.tags);
      if (cleaned.error) return res.status(400).json({ error: cleaned.error });
      if (cleaned.value.length) filter.tags = { $all: cleaned.value };
    }
    if (typeof req.query.difficulty === 'string' && req.query.difficulty.trim()) {
      const d = req.query.difficulty.trim();
      if (!RECIPE_DIFFICULTIES.includes(d)) {
        return res.status(400).json({ error: `Difficulty must be one of: ${RECIPE_DIFFICULTIES.join(', ')}.` });
      }
      filter.difficulty = d;
    }
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

// --- Week plan (dated weeks; GET/PUT /week kept as aliases) ---
// Dinner System Phase 1 (2026-11-06), spec §3.1/§4.1. One Week doc
// per week, keyed by weekStart (the Sunday). The legacy pre-Phase-1
// doc has no weekStart: until scripts/migrate-dated-weeks.js stamps
// it, resolveCurrentWeek() keeps serving it as the current plan, so
// there is never a forked "two current weeks" state. Responses are
// serialised (full 7-day shape, weekStart, timestamps) — a superset
// of the old raw-doc response; both apps read only `.days`.
const EMPTY_DAYS = { sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null };

function serializeWeek(doc) {
  const stored = doc.days && typeof doc.days === 'object' ? doc.days : {};
  const days = {};
  for (const day of DAY_KEYS) days[day] = stored[day] ?? null;
  return {
    _id: doc._id,
    id: doc._id.toString(),
    weekStart: doc.weekStart || null,
    days,
    suggestionSetId: doc.suggestionSetId ? doc.suggestionSetId.toString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// One day assignment: null (clear), a recipe pick, or a custom meal.
// assignedBy/assignedAt are opaque pass-through fields the Hub
// bridge stamps (spec §4.2); family-api stores them without
// interpreting them. Returns { value } or { error }.
function cleanAssignment(input) {
  if (input === null || input === undefined) return { value: null };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'A day assignment must be an object or null.' };
  }
  const extra = {};
  for (const field of ['assignedBy', 'assignedAt']) {
    if (input[field] !== undefined && input[field] !== null) {
      if (typeof input[field] !== 'string') return { error: `${field} must be text.` };
      extra[field] = input[field].slice(0, field === 'assignedBy' ? 80 : 40);
    }
  }
  if (input.kind === 'recipe') {
    if (!input.recipeId || !mongoose.isValidObjectId(input.recipeId)) {
      return { error: 'A recipe assignment needs a valid recipeId.' };
    }
    return { value: { kind: 'recipe', recipeId: String(input.recipeId), ...extra } };
  }
  if (input.kind === 'custom') {
    if (typeof input.name !== 'string' || !input.name.trim()) {
      return { error: 'A custom meal needs a name.' };
    }
    return {
      value: {
        kind: 'custom',
        name: input.name.trim().slice(0, 200),
        note: typeof input.note === 'string' ? input.note.slice(0, 500) : '',
        ...extra,
      },
    };
  }
  return { error: 'A day assignment must have kind "recipe" or "custom" (or be null).' };
}

// Wholesale days input. Only the day keys actually present are
// stored (the pre-Phase-1 PUT /week stored exactly what it was sent;
// that behaviour is preserved). No days at all -> an empty week.
function cleanDays(input) {
  if (input === undefined || input === null) return { value: { ...EMPTY_DAYS } };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'days must be an object keyed by day.' };
  }
  const value = {};
  for (const day of DAY_KEYS) {
    if (input[day] !== undefined) {
      const r = cleanAssignment(input[day]);
      if (r.error) return { error: `${day}: ${r.error}` };
      value[day] = r.value;
    }
  }
  return { value };
}

async function linkSuggestionSet(week) {
  if (!week.weekStart || week.suggestionSetId) return;
  const set = await SuggestionSet.findOne({ weekStart: week.weekStart, status: 'open' }).sort({ createdAt: -1 });
  if (set) {
    week.suggestionSetId = set._id;
    await week.save();
  }
}

async function getOrCreateDatedWeek(weekStart) {
  let week = await Week.findOne({ weekStart });
  if (!week) {
    week = await Week.create({ weekStart, days: { ...EMPTY_DAYS } });
    await linkSuggestionSet(week);
  }
  return week;
}

// The doc the /week aliases mean: the current week's dated doc if
// there is one; else the legacy undated doc (pre-migration state —
// the plan must not fork); else a fresh dated doc for this week.
async function resolveCurrentWeek() {
  const ws = currentWeekStart();
  let week = await Week.findOne({ weekStart: ws });
  if (week) return week;
  week = await Week.findOne({ weekStart: { $exists: false } });
  if (week) return week;
  week = await Week.create({ weekStart: ws, days: { ...EMPTY_DAYS } });
  await linkSuggestionSet(week);
  return week;
}

function validWeekStartParam(req, res) {
  const ws = req.params.weekStart;
  if (!isValidWeekStart(ws)) {
    res.status(400).json({ error: 'weekStart must be a Sunday, as YYYY-MM-DD.' });
    return null;
  }
  return ws;
}

router.get('/week', async (_req, res, next) => {
  try {
    res.json(serializeWeek(await resolveCurrentWeek()));
  } catch (err) {
    next(err);
  }
});

router.put('/week', async (req, res, next) => {
  try {
    const cleaned = cleanDays(req.body && req.body.days);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const week = await resolveCurrentWeek();
    week.days = cleaned.value;
    await week.save();
    res.json(serializeWeek(week));
  } catch (err) {
    next(err);
  }
});

router.get('/weeks/:weekStart', async (req, res, next) => {
  try {
    const ws = validWeekStartParam(req, res);
    if (!ws) return;
    res.json(serializeWeek(await getOrCreateDatedWeek(ws)));
  } catch (err) {
    next(err);
  }
});

router.put('/weeks/:weekStart', async (req, res, next) => {
  try {
    const ws = validWeekStartParam(req, res);
    if (!ws) return;
    const cleaned = cleanDays(req.body && req.body.days);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const week = await getOrCreateDatedWeek(ws);
    week.days = cleaned.value;
    await week.save();
    res.json(serializeWeek(week));
  } catch (err) {
    next(err);
  }
});

// Set or clear ONE day — the assign control's endpoint (spec §4.1):
// two adults picking simultaneously never read-modify-write the
// whole week. Body is one assignment object, or { assignment: ... }
// wrapping one; an empty object (or { assignment: null }) clears
// the day. (A literal JSON `null` body never reaches here — the
// app's strict JSON parser rejects non-object bodies, as it always
// has for every route in this API.)
router.put('/weeks/:weekStart/days/:day', async (req, res, next) => {
  try {
    const ws = validWeekStartParam(req, res);
    if (!ws) return;
    const day = req.params.day;
    if (!DAY_KEYS.includes(day)) {
      return res.status(400).json({ error: `day must be one of: ${DAY_KEYS.join(', ')}.` });
    }
    let raw = req.body;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if ('assignment' in raw) raw = raw.assignment;
      else if (Object.keys(raw).length === 0) raw = null;
    }
    const cleaned = cleanAssignment(raw === undefined ? null : raw);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const week = await getOrCreateDatedWeek(ws);
    week.days = { ...(week.days || {}), [day]: cleaned.value };
    await week.save();
    res.json(serializeWeek(week));
  } catch (err) {
    next(err);
  }
});

// --- Pantry staples (spec §3.4) ---
async function getOrCreateStaples() {
  let doc = await PantryStaples.findOne();
  if (!doc) {
    doc = await PantryStaples.create({ staples: DEFAULT_STAPLES });
  }
  return doc;
}

router.get('/pantry-staples', async (_req, res, next) => {
  try {
    const doc = await getOrCreateStaples();
    res.json({ staples: doc.staples, updatedAt: doc.updatedAt });
  } catch (err) {
    next(err);
  }
});

router.put('/pantry-staples', async (req, res, next) => {
  try {
    const input = req.body && req.body.staples;
    if (!Array.isArray(input) || input.some((s) => typeof s !== 'string')) {
      return res.status(400).json({ error: 'staples must be a list of text names.' });
    }
    const staples = [...new Set(input.map((s) => normalizeText(s)).filter(Boolean))].slice(0, 200);
    const doc = await getOrCreateStaples();
    doc.staples = staples;
    await doc.save();
    res.json({ staples: doc.staples, updatedAt: doc.updatedAt });
  } catch (err) {
    next(err);
  }
});

// --- Consolidation engine endpoint (spec §8) ---
router.get('/weeks/:weekStart/shopping-list', async (req, res, next) => {
  try {
    const ws = validWeekStartParam(req, res);
    if (!ws) return;
    const week = await getOrCreateDatedWeek(ws);
    const days = week.days || {};
    const ids = [
      ...new Set(
        DAY_KEYS.map((d) => days[d])
          .filter((a) => a && a.kind === 'recipe' && a.recipeId)
          .map((a) => String(a.recipeId)),
      ),
    ];
    const recipes = ids.length ? await Recipe.find({ _id: { $in: ids } }) : [];
    const byId = new Map(recipes.map((r) => [r._id.toString(), r]));
    const entries = [];
    for (const day of DAY_KEYS) {
      const a = days[day];
      if (!a || a.kind !== 'recipe') continue; // custom days contribute nothing — never guess
      const recipe = byId.get(String(a.recipeId));
      if (!recipe) continue;
      for (const line of recipe.ingredients || []) entries.push({ line, meal: recipe.name });
    }
    const staplesDoc = await getOrCreateStaples();
    const { items, excluded } = buildShoppingList(entries, staplesDoc.staples);
    res.json({ weekStart: ws, items, excluded });
  } catch (err) {
    next(err);
  }
});

// --- Suggestion sets (spec §3.2/§5) ---
async function serializeSuggestionSet(set) {
  const ids = set.items.map((i) => i.recipeId);
  const recipes = ids.length ? await Recipe.find({ _id: { $in: ids } }) : [];
  const byId = new Map(recipes.map((r) => [r._id.toString(), r]));
  return {
    _id: set._id,
    id: set._id.toString(),
    weekStart: set.weekStart,
    status: set.status,
    createdBy: set.createdBy,
    theme: set.theme || '',
    estimatedTotal: set.estimatedTotal ?? null,
    items: set.items.map((i) => ({
      recipeId: i.recipeId.toString(),
      suggestedDay: i.suggestedDay ?? null,
      note: i.note || '',
      recipe: byId.get(i.recipeId.toString()) ? serializeRecipe(byId.get(i.recipeId.toString())) : null,
    })),
    createdAt: set.createdAt,
    updatedAt: set.updatedAt,
  };
}

// Fred's authoring path: one POST plants a whole week's suggestions.
// Recipes are name-matched against the library or created from the
// payload — the same match/create the What's For Dinner import does
// client-side (routes/menu.js is now the one server-side home for
// it). Items may arrive as `items` or as `recipes` (the import JSON's
// key); each item is a recipe payload ({ name, time, ingredients,
// steps, tip, ... }) or { recipe, ... }, plus its own suggestedDay /
// note, or a bare { recipeId, suggestedDay, note }.
router.post('/suggestion-sets', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (!isValidWeekStart(body.weekStart)) {
      return res.status(400).json({ error: 'weekStart must be a Sunday, as YYYY-MM-DD.' });
    }
    const rawItems = Array.isArray(body.items) ? body.items : Array.isArray(body.recipes) ? body.recipes : null;
    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({ error: 'A suggestion set needs at least one item.' });
    }
    if (rawItems.length > 30) {
      return res.status(400).json({ error: 'Too many items (max 30).' });
    }
    let theme = '';
    if (body.theme !== undefined && body.theme !== null) {
      if (typeof body.theme !== 'string') return res.status(400).json({ error: 'theme must be text.' });
      theme = body.theme.trim().slice(0, 120);
    }
    let estimatedTotal;
    if (body.estimatedTotal !== undefined && body.estimatedTotal !== null) {
      const n = Number(body.estimatedTotal);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'estimatedTotal must be a non-negative number.' });
      estimatedTotal = n;
    }
    const createdBy =
      typeof body.createdBy === 'string' && body.createdBy.trim() ? body.createdBy.trim().slice(0, 40) : 'fred';

    const items = [];
    const seen = new Set();
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return res.status(400).json({ error: 'Each suggestion item must be an object.' });
      }
      const suggestedDay = raw.suggestedDay ?? null;
      if (suggestedDay !== null && !DAY_KEYS.includes(suggestedDay)) {
        return res.status(400).json({ error: `suggestedDay must be one of: ${DAY_KEYS.join(', ')}, or null.` });
      }
      const note = typeof raw.note === 'string' ? raw.note.slice(0, 500) : '';
      let recipe = null;
      if (raw.recipeId !== undefined && raw.recipeId !== null) {
        if (!mongoose.isValidObjectId(raw.recipeId)) {
          return res.status(400).json({ error: 'A suggestion item recipeId is not a valid id.' });
        }
        recipe = await Recipe.findById(raw.recipeId);
        if (!recipe) return res.status(400).json({ error: 'A suggestion item recipeId does not match a recipe.' });
      } else {
        const payload = raw.recipe && typeof raw.recipe === 'object' ? raw.recipe : raw;
        const name = payload.title !== undefined ? payload.title : payload.name;
        if (typeof name === 'string' && name.trim()) {
          const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          recipe = await Recipe.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
        }
        if (!recipe) {
          const cleaned = cleanRecipeInput(payload, { requireTitle: true });
          if (cleaned.error) return res.status(400).json({ error: `Suggestion item: ${cleaned.error}` });
          recipe = await Recipe.create(cleaned.value);
        }
      }
      const key = recipe._id.toString();
      if (seen.has(key)) continue; // one entry per recipe per set
      seen.add(key);
      items.push({ recipeId: recipe._id, suggestedDay, note });
    }

    // Supersede: the week's previous open set closes (kept as
    // history); picks already made live in the Week and are untouched.
    await SuggestionSet.updateMany(
      { weekStart: body.weekStart, status: 'open' },
      { $set: { status: 'closed' } },
    );
    const set = await SuggestionSet.create({
      weekStart: body.weekStart,
      status: 'open',
      createdBy,
      theme,
      estimatedTotal,
      items,
    });
    // Link the week's doc to its (new) set when the doc already exists.
    const week = await Week.findOne({ weekStart: body.weekStart });
    if (week) {
      week.suggestionSetId = set._id;
      await week.save();
    }
    return res.status(201).json(await serializeSuggestionSet(set));
  } catch (err) {
    return next(err);
  }
});

// The open set: the earliest open set whose week has not begun yet
// (weekStart on/after the current week's Sunday). Defined BEFORE
// /suggestion-sets/:weekStart so "open" is never parsed as a date.
router.get('/suggestion-sets/open', async (_req, res, next) => {
  try {
    const set = await SuggestionSet.findOne({
      status: 'open',
      weekStart: { $gte: currentWeekStart() },
    }).sort({ weekStart: 1 });
    if (!set) return res.json(null);
    return res.json(await serializeSuggestionSet(set));
  } catch (err) {
    return next(err);
  }
});

router.get('/suggestion-sets/:weekStart', async (req, res, next) => {
  try {
    const ws = validWeekStartParam(req, res);
    if (!ws) return;
    const set = await SuggestionSet.findOne({ weekStart: ws }).sort({ createdAt: -1 });
    if (!set) return res.status(404).json({ error: 'Suggestion set not found' });
    return res.json(await serializeSuggestionSet(set));
  } catch (err) {
    return next(err);
  }
});

// --- Favorites history — the starred-for-later archive (spec §7) ---
// Derived, never stored: every starred recipe, annotated with the
// last date it was actually served and how many times, computed from
// the dated weeks whose day has passed. (The one legacy undated doc
// has no dates to derive from and is not counted.)
router.get('/favorites/history', async (_req, res, next) => {
  try {
    const starred = await Recipe.find({ favorite: true }).sort({ name: 1 });
    const weeks = await Week.find({ weekStart: { $exists: true, $ne: null } });
    const today = todayString();
    const stats = new Map();
    for (const w of weeks) {
      const days = w.days || {};
      for (const day of DAY_KEYS) {
        const a = days[day];
        if (!a || a.kind !== 'recipe' || !a.recipeId) continue;
        const date = dateOfDay(w.weekStart, day);
        if (!date || date > today) continue; // only days that have passed
        const key = String(a.recipeId);
        const s = stats.get(key) || { timesServed: 0, lastServed: null };
        s.timesServed += 1;
        if (!s.lastServed || date > s.lastServed) s.lastServed = date;
        stats.set(key, s);
      }
    }
    const out = starred.map((r) => {
      const s = stats.get(r._id.toString()) || { timesServed: 0, lastServed: null };
      return { recipe: serializeRecipe(r), lastServed: s.lastServed, timesServed: s.timesServed };
    });
    out.sort(
      (a, b) =>
        (b.lastServed || '').localeCompare(a.lastServed || '') ||
        a.recipe.name.localeCompare(b.recipe.name),
    );
    res.json(out);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
