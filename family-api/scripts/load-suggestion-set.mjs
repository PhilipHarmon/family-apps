// Load a Fred-authored dinner SuggestionSet from a JSON file
// (Dinner System Phase 1 follow-on, 2026-11-06).
//
// The file is exactly the body POST /suggestion-sets accepts
// (routes/menu.js): { weekStart, theme?, estimatedTotal?, createdBy?,
// items: [...] }, each item a flat recipe payload ({ name, time,
// ingredients, steps, tip, tags, ... }) plus its own suggestedDay /
// note — or a bare { recipeId, suggestedDay, note }. One extra key is
// allowed per item: estimatedCost (Fred's per-dinner estimate). The
// API has no cost field on Recipe, so the loader only uses it for the
// printed plan and — when the file omits estimatedTotal — to roll up
// the set-level SuggestionSet.estimatedTotal.
//
// Semantics mirror the endpoint exactly (routes/menu.js, POST
// /suggestion-sets): a payload item is matched against the library by
// case-insensitive exact name and REUSED when found, otherwise the
// recipe is created; posting closes the week's previous open set
// (supersede) and never touches Week.days; an existing Week doc for
// the week gets linked (suggestionSetId). Validation below mirrors
// cleanRecipeInput / cleanTags / isValidWeekStart, because those
// helpers are not exported from the routes module.
//
// DRY RUN BY DEFAULT — resolves and prints everything, writes nothing.
//   node scripts/load-suggestion-set.mjs <suggestions.json>            # dry run
//   node scripts/load-suggestion-set.mjs <suggestions.json> --apply    # write
//   node scripts/load-suggestion-set.mjs <suggestions.json> --validate-only
//        # validate + print the plan only; never opens a DB connection
//
// Like its sibling one-time scripts, the dry run itself (past
// --validate-only) needs the family-api environment: it connects to
// Mongo to resolve name matches, reads MONGO_URI from family-api/.env,
// and aborts when that is not set.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const RECIPE_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// --- Date check, mirroring weeks.js parseDate + isValidWeekStart ---
function parseDate(str) {
  if (typeof str !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (
    d.getUTCFullYear() !== Number(m[1]) ||
    d.getUTCMonth() !== Number(m[2]) - 1 ||
    d.getUTCDate() !== Number(m[3])
  ) {
    return null;
  }
  return d;
}
const isValidWeekStart = (str) => {
  const d = parseDate(str);
  return d !== null && d.getUTCDay() === 0;
};

// --- Recipe payload validation, mirroring cleanRecipeInput/cleanTags ---
function validateRecipePayload(p, label, errors) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) {
    errors.push(`${label}: recipe payload must be an object.`);
    return;
  }
  const title = p.title !== undefined ? p.title : p.name;
  if (typeof title !== 'string' || !title.trim()) errors.push(`${label}: a recipe needs a title (name).`);
  else if (title.trim().length > 200) errors.push(`${label}: title is too long (max 200 characters).`);
  for (const [field, max] of [['time', 80], ['tip', 1000], ['description', 2000], ['notes', 2000]]) {
    if (p[field] !== undefined && p[field] !== null && typeof p[field] !== 'string') {
      errors.push(`${label}: ${field} must be text.`);
    } else if (typeof p[field] === 'string' && p[field].length > max) {
      errors.push(`${label}: ${field} is too long (max ${max} characters).`);
    }
  }
  if (p.difficulty !== undefined && p.difficulty !== '' && p.difficulty !== null) {
    if (!RECIPE_DIFFICULTIES.includes(String(p.difficulty).trim())) {
      errors.push(`${label}: difficulty must be one of: ${RECIPE_DIFFICULTIES.join(', ')}.`);
    }
  }
  for (const field of ['prepMinutes', 'cookMinutes']) {
    if (p[field] !== undefined && p[field] !== null && p[field] !== '') {
      const n = Number(p[field]);
      if (!Number.isFinite(n) || n < 0 || n > 10080) errors.push(`${label}: ${field} must be a number of minutes (0-10080).`);
    }
  }
  for (const field of ['ingredients', 'steps']) {
    if (p[field] !== undefined && (!Array.isArray(p[field]) || p[field].some((i) => typeof i !== 'string'))) {
      errors.push(`${label}: ${field} must be a list of text lines.`);
    }
  }
  if (p.tags !== undefined) {
    const list = typeof p.tags === 'string' ? p.tags.split(',') : p.tags;
    if (!Array.isArray(list) || list.some((t) => typeof t !== 'string')) {
      errors.push(`${label}: tags must be a list of text slugs.`);
    } else {
      const slugs = list.map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (slugs.length > 20) errors.push(`${label}: too many tags (max 20).`);
      if (slugs.some((t) => t.length > 40 || !/^[a-z0-9][a-z0-9-]*$/.test(t))) {
        errors.push(`${label}: tags must be lowercase slugs like "crockpot" or "one-pot".`);
      }
    }
  }
}

// Validate the whole file the way the endpoint would, and normalise
// the pieces the write phase needs. Returns { errors, plan }.
function validateSet(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { errors: ['The file must contain one JSON object (the suggestion set).'], plan: null };
  }
  if (!isValidWeekStart(data.weekStart)) {
    errors.push(`weekStart "${data.weekStart}" must be a Sunday, as YYYY-MM-DD.`);
  }
  const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(data.recipes) ? data.recipes : null;
  if (!rawItems || rawItems.length === 0) errors.push('A suggestion set needs at least one item.');
  else if (rawItems.length > 30) errors.push('Too many items (max 30).');
  if (data.theme !== undefined && data.theme !== null && typeof data.theme !== 'string') {
    errors.push('theme must be text.');
  }
  let estimatedTotal;
  if (data.estimatedTotal !== undefined && data.estimatedTotal !== null) {
    const n = Number(data.estimatedTotal);
    if (!Number.isFinite(n) || n < 0) errors.push('estimatedTotal must be a non-negative number.');
    else estimatedTotal = n;
  }
  const items = [];
  if (rawItems) {
    rawItems.forEach((raw, i) => {
      const label = `item ${i + 1}`;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        errors.push(`${label}: each suggestion item must be an object.`);
        return;
      }
      const suggestedDay = raw.suggestedDay ?? null;
      if (suggestedDay !== null && !DAY_KEYS.includes(suggestedDay)) {
        errors.push(`${label}: suggestedDay must be one of: ${DAY_KEYS.join(', ')}, or null.`);
      }
      if (raw.note !== undefined && typeof raw.note !== 'string') errors.push(`${label}: note must be text.`);
      let estimatedCost;
      if (raw.estimatedCost !== undefined && raw.estimatedCost !== null) {
        const n = Number(raw.estimatedCost);
        if (!Number.isFinite(n) || n < 0) errors.push(`${label}: estimatedCost must be a non-negative number.`);
        else estimatedCost = n;
      }
      let recipeId = null;
      let payload = null;
      if (raw.recipeId !== undefined && raw.recipeId !== null) {
        if (typeof raw.recipeId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(raw.recipeId)) {
          errors.push(`${label}: recipeId is not a valid id.`);
        } else recipeId = raw.recipeId;
      } else {
        payload = raw.recipe && typeof raw.recipe === 'object' ? raw.recipe : raw;
        validateRecipePayload(payload, label, errors);
      }
      items.push({
        recipeId,
        payload,
        suggestedDay,
        note: typeof raw.note === 'string' ? raw.note.slice(0, 500) : '',
        estimatedCost,
      });
    });
  }
  if (estimatedTotal === undefined) {
    const costs = items.map((i) => i.estimatedCost);
    if (costs.length && costs.every((c) => typeof c === 'number')) {
      estimatedTotal = costs.reduce((a, b) => a + b, 0);
    }
  }
  return {
    errors,
    plan: {
      weekStart: data.weekStart,
      status: 'open',
      createdBy:
        typeof data.createdBy === 'string' && data.createdBy.trim() ? data.createdBy.trim().slice(0, 40) : 'fred',
      theme: typeof data.theme === 'string' ? data.theme.trim().slice(0, 120) : '',
      estimatedTotal,
      items,
    },
  };
}

function printPlan(plan) {
  console.log(`SuggestionSet for weekStart ${plan.weekStart} (status: open, createdBy: ${plan.createdBy})`);
  if (plan.theme) console.log(`  theme: ${plan.theme}`);
  if (plan.estimatedTotal !== undefined) console.log(`  estimatedTotal: $${plan.estimatedTotal}`);
  console.log(`  items: ${plan.items.length}`);
  for (const item of plan.items) {
    const day = item.suggestedDay ? item.suggestedDay.toUpperCase() : 'SPARE';
    const cost = item.estimatedCost !== undefined ? ` ~$${item.estimatedCost}` : '';
    if (item.recipeId) {
      console.log(`    [${day}] recipeId ${item.recipeId}${cost}${item.note ? ` — ${item.note}` : ''}`);
    } else {
      const name = (item.payload.title !== undefined ? item.payload.title : item.payload.name || '').trim();
      const tags = Array.isArray(item.payload.tags) && item.payload.tags.length ? ` [${item.payload.tags.join(', ')}]` : '';
      console.log(`    [${day}] ${name}${cost}${tags}${item.note ? ` — ${item.note}` : ''}`);
    }
  }
}

// Build the Recipe document fields for a create, applying the same
// whitelist/normalisation as routes/menu.js cleanRecipeInput.
function cleanForCreate(p) {
  const value = {};
  value.name = (p.title !== undefined ? p.title : p.name).trim();
  for (const [field, max] of [['time', 80], ['sourceUrl', 1000], ['sourceName', 120], ['description', 2000], ['tip', 1000], ['notes', 2000], ['imageUrl', 1000]]) {
    if (p[field] !== undefined) value[field] = (p[field] || '').trim().slice(0, max);
  }
  if (p.difficulty !== undefined) value.difficulty = (p.difficulty || '').trim();
  for (const field of ['prepMinutes', 'cookMinutes']) {
    if (p[field] !== undefined) value[field] = p[field] === null || p[field] === '' ? null : Math.round(Number(p[field]));
  }
  if (p.ingredients !== undefined) value.ingredients = p.ingredients.map((i) => i.trim()).filter(Boolean).slice(0, 200);
  if (p.instructions !== undefined && typeof p.instructions === 'string') {
    value.instructions = p.instructions;
    value.steps = p.instructions.split('\n').map((s) => s.trim()).filter(Boolean);
  } else if (p.steps !== undefined) {
    value.steps = p.steps.map((s) => s.trim()).filter(Boolean);
    value.instructions = value.steps.join('\n');
  }
  if (p.favorite !== undefined) value.favorite = !!p.favorite;
  if (p.tags !== undefined) {
    const list = typeof p.tags === 'string' ? p.tags.split(',') : p.tags;
    value.tags = [...new Set(list.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const validateOnly = args.includes('--validate-only');
  const fileArg = args.find((a) => !a.startsWith('--'));
  if (!fileArg) {
    console.error('Usage: node scripts/load-suggestion-set.mjs <suggestions.json> [--apply] [--validate-only]');
    process.exit(1);
  }

  // Phase A — read + validate + print the plan (no DB, no deps).
  let data;
  try {
    data = JSON.parse(await readFile(path.resolve(fileArg), 'utf8'));
  } catch (err) {
    console.error(`Cannot read/parse ${fileArg}: ${err.message}`);
    process.exit(1);
  }
  const { errors, plan } = validateSet(data);
  if (errors.length) {
    console.error(`Invalid suggestion set in ${fileArg}:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(apply ? 'APPLY mode — this run writes.' : 'DRY RUN — nothing will be written.');
  printPlan(plan);
  if (validateOnly) {
    console.log('Validation passed. (--validate-only: no database connection made.)');
    return;
  }

  // Phase B — resolve against the library, exactly like the endpoint.
  let dotenv;
  let mongoose;
  let models;
  try {
    dotenv = (await import('dotenv')).default;
    mongoose = (await import('mongoose')).default;
    models = await import('../models.js');
  } catch {
    console.error(
      'Dependencies are not installed here — run `npm install` in family-api first. ' +
        '(The plan above validated cleanly; nothing was written.)',
    );
    process.exit(1);
  }
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set (family-api/.env). Aborting — nothing was written.');
    process.exit(1);
  }
  const { Recipe, SuggestionSet, Week } = models;
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const resolved = [];
    const seen = new Set();
    for (const item of plan.items) {
      let recipe = null;
      if (item.recipeId) {
        recipe = await Recipe.findById(item.recipeId);
        if (!recipe) {
          console.error(`A suggestion item recipeId (${item.recipeId}) does not match a recipe. Aborting — nothing was written.`);
          process.exitCode = 1;
          return;
        }
        console.log(`  REUSE (by id): "${recipe.name}"`);
      } else {
        const name = (item.payload.title !== undefined ? item.payload.title : item.payload.name).trim();
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        recipe = await Recipe.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
        if (recipe) {
          console.log(`  REUSE (name match): "${recipe.name}"`);
        } else if (apply) {
          recipe = await Recipe.create(cleanForCreate(item.payload));
          console.log(`  CREATED: "${recipe.name}"`);
        } else {
          console.log(`  WOULD CREATE: "${name}"`);
        }
      }
      const key = recipe ? recipe._id.toString() : `new:${item.payload.name.trim().toLowerCase()}`;
      if (seen.has(key)) {
        console.log('    (duplicate of an earlier item — the endpoint keeps one entry per recipe per set; skipped)');
        continue;
      }
      seen.add(key);
      resolved.push({ recipeId: recipe ? recipe._id : null, item });
    }

    const previousOpen = await SuggestionSet.countDocuments({ weekStart: plan.weekStart, status: 'open' });
    if (!apply) {
      console.log(
        `DRY RUN complete: ${resolved.length} item(s) would be planted for ${plan.weekStart}` +
          (previousOpen ? `; ${previousOpen} open set(s) for that week would be closed (superseded).` : '.') +
          ' Re-run with --apply to write.',
      );
      return;
    }

    if (resolved.some((r) => !r.recipeId)) {
      console.error('Internal error: an item failed to resolve to a recipe during apply. Aborting.');
      process.exitCode = 1;
      return;
    }
    await SuggestionSet.updateMany({ weekStart: plan.weekStart, status: 'open' }, { $set: { status: 'closed' } });
    const set = await SuggestionSet.create({
      weekStart: plan.weekStart,
      status: 'open',
      createdBy: plan.createdBy,
      theme: plan.theme,
      estimatedTotal: plan.estimatedTotal,
      items: resolved.map(({ recipeId, item }) => ({
        recipeId,
        suggestedDay: item.suggestedDay,
        note: item.note,
      })),
    });
    const week = await Week.findOne({ weekStart: plan.weekStart });
    if (week) {
      week.suggestionSetId = set._id;
      await week.save();
      console.log(`Linked the Week doc for ${plan.weekStart} to the new set.`);
    }
    console.log(`Done. SuggestionSet ${set._id} for ${plan.weekStart} is open with ${set.items.length} items.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
