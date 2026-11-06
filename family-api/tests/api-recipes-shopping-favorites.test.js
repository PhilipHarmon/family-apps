const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { boot, shutdown, reset, makeClient } = require('./helpers');
const { Recipe } = require('../models');
const { currentWeekStart, addDays } = require('../weeks');

let ctx;
let req;

before(async () => {
  ctx = await boot();
  req = makeClient(ctx.base);
});
after(async () => {
  await shutdown(ctx);
});
beforeEach(async () => {
  await reset();
});

async function makeRecipe(body) {
  const { status, json } = await req('POST', '/recipes', body);
  assert.equal(status, 201, JSON.stringify(json));
  return json;
}

test('tags: written normalised, filtered with ALL semantics, combined with difficulty', async () => {
  const chili = await makeRecipe({
    name: 'Slow Chili',
    difficulty: 'Easy',
    tags: ['Crockpot', ' One-Pot '],
    ingredients: [],
    steps: [],
  });
  assert.deepEqual(chili.tags, ['crockpot', 'one-pot'], 'tags are stored as lowercase slugs');
  await makeRecipe({ name: 'Grilled Corn', difficulty: 'Easy', tags: ['grill'], ingredients: [], steps: [] });

  const byTag = await req('GET', '/recipes?tags=crockpot');
  assert.deepEqual(byTag.json.map((r) => r.name), ['Slow Chili']);
  const allTags = await req('GET', '/recipes?tags=crockpot,one-pot');
  assert.equal(allTags.json.length, 1);
  const noMatch = await req('GET', '/recipes?tags=crockpot,grill');
  assert.equal(noMatch.json.length, 0, 'ALL semantics: no recipe carries both');
  const combo = await req('GET', '/recipes?tags=grill&difficulty=Easy');
  assert.deepEqual(combo.json.map((r) => r.name), ['Grilled Corn']);
  const badDifficulty = await req('GET', '/recipes?difficulty=Spicy');
  assert.equal(badDifficulty.status, 400);

  const updated = await req('PUT', `/recipes/${chili._id}`, { tags: ['crockpot', 'freezer-friendly'] });
  assert.deepEqual(updated.json.tags, ['crockpot', 'freezer-friendly'], 'PUT accepts tags');
  const badTag = await req('POST', '/recipes', { name: 'Bad Tag Stew', tags: ['Not A Slug!'] });
  assert.equal(badTag.status, 400);
});

test('shopping list: consolidation across the week, staples held back, custom days ignored', async () => {
  const a = await makeRecipe({
    name: 'Roast Chicken',
    ingredients: ['1 lb chicken thighs', 'Salt', '2 tbsp flour'],
    steps: [],
  });
  const b = await makeRecipe({
    name: 'Chicken Rice Bowls',
    ingredients: ['8 oz chicken thighs', '1 cup rice'],
    steps: [],
  });
  const ws = addDays(currentWeekStart(), 7);
  await req('PUT', `/weeks/${ws}`, {
    days: {
      sun: { kind: 'recipe', recipeId: a._id },
      mon: { kind: 'recipe', recipeId: b._id },
      tue: { kind: 'custom', name: 'Pizza Night', note: '' },
    },
  });
  const { status, json } = await req('GET', `/weeks/${ws}/shopping-list`);
  assert.equal(status, 200);
  const chicken = json.items.find((i) => i.name === 'chicken thighs');
  assert.ok(chicken, 'chicken merged across both dinners');
  assert.deepEqual(chicken.variants, ['1 lb', '8 oz'], 'different units are noted, never totalled');
  assert.deepEqual(chicken.meals, ['Roast Chicken', 'Chicken Rice Bowls']);
  const rice = json.items.find((i) => i.name === 'rice');
  assert.equal(rice.quantity, '1 cup');
  const excludedNames = json.excluded.map((i) => i.name.toLowerCase());
  assert.ok(excludedNames.includes('salt'), 'salt is held back as a staple — but revealable');
  assert.ok(excludedNames.includes('flour'));
  assert.equal(json.items.length, 2, 'the custom pizza night contributed nothing automatically');
});

test('pantry staples: seeded on first read, replaceable, and the engine obeys', async () => {
  const seeded = await req('GET', '/pantry-staples');
  assert.ok(seeded.json.staples.includes('salt'));
  const a = await makeRecipe({ name: 'Rice Night', ingredients: ['1 cup rice', 'Salt'], steps: [] });
  const ws = addDays(currentWeekStart(), 7);
  await req('PUT', `/weeks/${ws}`, { days: { sun: { kind: 'recipe', recipeId: a._id } } });
  const put = await req('PUT', '/pantry-staples', { staples: ['Rice'] });
  assert.deepEqual(put.json.staples, ['rice'], 'staples are stored normalised');
  const list = await req('GET', `/weeks/${ws}/shopping-list`);
  assert.deepEqual(list.json.excluded.map((i) => i.name), ['rice']);
  assert.deepEqual(list.json.items.map((i) => i.name), ['Salt'], 'salt is back on the list once un-stapled');
});

test('favorites history: starred + served, past days only', async () => {
  const star = await makeRecipe({ name: 'Beloved Soup', ingredients: [], steps: [], favorite: true });
  const neverServed = await makeRecipe({ name: 'Starred But New', ingredients: [], steps: [], favorite: true });
  await makeRecipe({ name: 'Plain Pasta', ingredients: [], steps: [], favorite: false });

  const thisSunday = currentWeekStart();
  const nextSunday = addDays(thisSunday, 7);
  // Served this week's Sunday (a day that has passed) ...
  await req('PUT', `/weeks/${thisSunday}`, { days: { sun: { kind: 'recipe', recipeId: star._id } } });
  // ... and planned next week (must NOT count yet).
  await req('PUT', `/weeks/${nextSunday}`, { days: { sun: { kind: 'recipe', recipeId: star._id } } });

  const { status, json } = await req('GET', '/favorites/history');
  assert.equal(status, 200);
  assert.equal(json.length, 2, 'only starred recipes appear');
  const soup = json.find((e) => e.recipe.name === 'Beloved Soup');
  assert.equal(soup.timesServed, 1);
  assert.equal(soup.lastServed, thisSunday);
  const fresh = json.find((e) => e.recipe.name === 'Starred But New');
  assert.equal(fresh.timesServed, 0);
  assert.equal(fresh.lastServed, null);
  assert.ok(neverServed);
});
