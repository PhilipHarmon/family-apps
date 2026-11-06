const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { boot, shutdown, reset, makeClient } = require('./helpers');
const { Recipe, SuggestionSet, Week } = require('../models');
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

const nextSunday = () => addDays(currentWeekStart(), 7);

test('POST /suggestion-sets creates recipes by payload and joins them back', async () => {
  const ws = nextSunday();
  const { status, json } = await req('POST', '/suggestion-sets', {
    weekStart: ws,
    theme: 'cozy one-pot week',
    estimatedTotal: 69,
    items: [
      {
        name: 'White Chicken Chili',
        time: '~45 min',
        ingredients: ['Chicken breast', 'White beans'],
        steps: ['Simmer everything.'],
        suggestedDay: 'sun',
        note: 'Fred pick',
      },
      { name: 'Sheet Pan Sausage', ingredients: ['Sausage'], steps: [], suggestedDay: null },
    ],
  });
  assert.equal(status, 201);
  assert.equal(json.weekStart, ws);
  assert.equal(json.status, 'open');
  assert.equal(json.theme, 'cozy one-pot week');
  assert.equal(json.estimatedTotal, 69);
  assert.equal(json.items.length, 2);
  assert.equal(json.items[0].suggestedDay, 'sun');
  assert.equal(json.items[0].recipe.name, 'White Chicken Chili');
  assert.equal(await Recipe.countDocuments(), 2, 'payloads became library recipes');
});

test('name-matching reuses the library instead of duplicating (import semantics)', async () => {
  await Recipe.create({ name: 'Taco Soup', ingredients: [], steps: [] });
  const { status, json } = await req('POST', '/suggestion-sets', {
    weekStart: nextSunday(),
    recipes: [{ name: '  taco soup ', ingredients: ['ignored — matched, not created'], steps: [] }],
  });
  assert.equal(status, 201);
  assert.equal(await Recipe.countDocuments(), 1, 'no duplicate recipe was created');
  assert.equal(json.items[0].recipe.name, 'Taco Soup');
});

test('re-posting for the same week supersedes: old set closed, picks untouched', async () => {
  const ws = nextSunday();
  await req('POST', '/suggestion-sets', { weekStart: ws, items: [{ name: 'First Draft Stew' }] });
  const week = await req('GET', `/weeks/${ws}`);
  const tacos = await Recipe.create({ name: 'Tuesday Tacos', ingredients: [], steps: [] });
  await req('PUT', `/weeks/${ws}/days/tue`, { kind: 'recipe', recipeId: tacos._id.toString() });

  const second = await req('POST', '/suggestion-sets', {
    weekStart: ws,
    items: [{ name: 'Corrected Curry' }],
  });
  assert.equal(second.status, 201);
  const sets = await SuggestionSet.find({ weekStart: ws }).sort({ createdAt: 1 });
  assert.equal(sets.length, 2);
  assert.equal(sets[0].status, 'closed', 'the superseded set is closed');
  assert.equal(sets[1].status, 'open');

  const got = await req('GET', `/suggestion-sets/${ws}`);
  assert.equal(got.json.items[0].recipe.name, 'Corrected Curry', 'GET returns the current set');
  const open = await req('GET', '/suggestion-sets/open');
  assert.equal(open.json.items[0].recipe.name, 'Corrected Curry');

  const weekAfter = await Week.findOne({ weekStart: ws });
  assert.equal(weekAfter.days.tue.recipeId.toString(), tacos._id.toString(), 'the pick survived the supersede');
  assert.equal(weekAfter.suggestionSetId.toString(), second.json._id, 'the week links to the new set');
  assert.equal(week.json.weekStart, ws);
});

test('the open set is the upcoming one; absent set reads as null', async () => {
  const none = await req('GET', '/suggestion-sets/open');
  assert.equal(none.status, 200);
  assert.equal(none.json, null);
  await req('POST', '/suggestion-sets', { weekStart: nextSunday(), items: [{ name: 'Future Soup' }] });
  const open = await req('GET', '/suggestion-sets/open');
  assert.equal(open.json.items[0].recipe.name, 'Future Soup');
  const missing = await req('GET', '/suggestion-sets/2027-01-03');
  assert.equal(missing.status, 404);
});

test('validation: bad week, empty set, bad suggestedDay', async () => {
  const monday = await req('POST', '/suggestion-sets', {
    weekStart: addDays(currentWeekStart(), 1),
    items: [{ name: 'X' }],
  });
  assert.equal(monday.status, 400);
  const empty = await req('POST', '/suggestion-sets', { weekStart: nextSunday(), items: [] });
  assert.equal(empty.status, 400);
  const badDay = await req('POST', '/suggestion-sets', {
    weekStart: nextSunday(),
    items: [{ name: 'X', suggestedDay: 'funday' }],
  });
  assert.equal(badDay.status, 400);
});
