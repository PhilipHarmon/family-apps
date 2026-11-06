const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const { boot, shutdown, reset, makeClient } = require('./helpers');
const { Week, Recipe } = require('../models');
const { currentWeekStart } = require('../weeks');

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

test('the family key still gates everything', async () => {
  const res = await fetch(`${ctx.base}/week`);
  assert.equal(res.status, 401);
});

test('GET /week creates and returns the current dated week', async () => {
  const { status, json } = await req('GET', '/week');
  assert.equal(status, 200);
  assert.equal(json.weekStart, currentWeekStart());
  assert.deepEqual(Object.keys(json.days).sort(), ['fri', 'mon', 'sat', 'sun', 'thu', 'tue', 'wed']);
  assert.ok(Object.values(json.days).every((d) => d === null));
  assert.ok(json.updatedAt, 'dated weeks carry timestamps');
  assert.equal(await Week.countDocuments(), 1);
});

test('PUT /week then GET /week round-trips on the same single doc', async () => {
  const recipe = await Recipe.create({ name: 'Soup Night', ingredients: [], steps: [] });
  const put = await req('PUT', '/week', {
    days: { mon: { kind: 'recipe', recipeId: recipe._id.toString() } },
  });
  assert.equal(put.status, 200);
  const get = await req('GET', '/week');
  assert.equal(get.json.days.mon.kind, 'recipe');
  assert.equal(get.json.days.mon.recipeId, recipe._id.toString());
  assert.equal(await Week.countDocuments(), 1, 'the alias must never fork a second current week');
});

test('pre-migration: the legacy undated doc IS the current plan (no fork)', async () => {
  const legacy = await mongoose.connection.collection('weeks').insertOne({
    days: { wed: { kind: 'custom', name: 'Pizza Night', note: '' } },
  });
  const get = await req('GET', '/week');
  assert.equal(get.status, 200);
  assert.equal(get.json.weekStart, null, 'an unstamped doc reports weekStart null');
  assert.equal(get.json.days.wed.name, 'Pizza Night');
  const put = await req('PUT', '/week', { days: { sun: { kind: 'custom', name: 'Roast', note: '' } } });
  assert.equal(put.status, 200);
  assert.equal(await Week.countDocuments(), 1);
  const raw = await mongoose.connection.collection('weeks').findOne({ _id: legacy.insertedId });
  assert.equal(raw.days.sun.name, 'Roast', 'PUT /week updated the legacy doc itself');
});

test('the migration script stamps the legacy doc and is idempotent', async () => {
  await mongoose.connection.collection('weeks').insertOne({
    days: { fri: { kind: 'custom', name: 'Leftover Night', note: '' } },
  });
  const script = path.join(__dirname, '..', 'scripts', 'migrate-dated-weeks.js');
  const run = () =>
    new Promise((resolve, reject) => {
      execFile(
        process.execPath,
        [script, '--week-start=2026-11-08'],
        { env: { ...process.env, MONGO_URI: ctx.uri } },
        (err, stdout) => (err ? reject(new Error(stdout || err.message)) : resolve(stdout)),
      );
    });
  const out1 = await run();
  assert.match(out1, /Stamping the undated Week/);
  const raw = await mongoose.connection.collection('weeks').findOne({});
  assert.equal(raw.weekStart, '2026-11-08');
  const out2 = await run();
  assert.match(out2, /Nothing to migrate/);
});

test('dated week endpoints: get, single-day set/clear, validation', async () => {
  const ws = '2026-11-08'; // a Sunday
  const recipe = await Recipe.create({ name: 'Tacos', ingredients: [], steps: [] });
  const created = await req('GET', `/weeks/${ws}`);
  assert.equal(created.status, 200);
  assert.equal(created.json.weekStart, ws);

  const set = await req('PUT', `/weeks/${ws}/days/tue`, {
    kind: 'recipe',
    recipeId: recipe._id.toString(),
    assignedBy: 'Jess',
  });
  assert.equal(set.status, 200);
  assert.equal(set.json.days.tue.recipeId, recipe._id.toString());
  assert.equal(set.json.days.tue.assignedBy, 'Jess', 'opaque attribution passes through');
  assert.equal(set.json.days.mon, null);

  const cleared = await req('PUT', `/weeks/${ws}/days/tue`, {});
  assert.equal(cleared.status, 200);
  assert.equal(cleared.json.days.tue, null);
  await req('PUT', `/weeks/${ws}/days/tue`, { kind: 'recipe', recipeId: recipe._id.toString() });
  const cleared2 = await req('PUT', `/weeks/${ws}/days/tue`, { assignment: null });
  assert.equal(cleared2.status, 200);
  assert.equal(cleared2.json.days.tue, null, '{ assignment: null } also clears');

  const badDate = await req('GET', '/weeks/2026-11-09'); // a Monday
  assert.equal(badDate.status, 400);
  const badDay = await req('PUT', `/weeks/${ws}/days/funday`, {});
  assert.equal(badDay.status, 400);
  const badAssignment = await req('PUT', `/weeks/${ws}/days/mon`, { kind: 'recipe' });
  assert.equal(badAssignment.status, 400, 'a recipe pick without a recipeId is rejected');
});

test('PUT /weeks/:weekStart replaces days wholesale', async () => {
  const ws = '2026-11-15';
  await req('PUT', `/weeks/${ws}`, { days: { fri: { kind: 'custom', name: 'Pizza', note: '' } } });
  const get = await req('GET', `/weeks/${ws}`);
  assert.equal(get.json.days.fri.name, 'Pizza');
  await req('PUT', `/weeks/${ws}`, { days: {} });
  const after = await req('GET', `/weeks/${ws}`);
  assert.equal(after.json.days.fri, null);
});
