const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { boot, shutdown, reset, makeClient } = require('./helpers');
const { RadioEpisode } = require('../models/RadioEpisode');

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

// The pilot episode's real shape: title, air date, a hosted mp3 and
// its runtime in seconds — the fields the Hub player renders.
function sampleEpisode() {
  return {
    title: 'Episode 1 — The Pilot',
    date: '2026-11-07',
    audioUrl: 'https://example.com/family-radio/ep01-pilot-2026-11-07.mp3',
    durationSec: 564,
    description: 'The very first Saturday morning around the radio.',
    createdBy: 'fred',
  };
}

test('create → list → get → delete round-trip, episode stays intact', async () => {
  const ep = sampleEpisode();
  const created = await req('POST', '/radio/episodes', ep);
  assert.equal(created.status, 201);
  assert.ok(created.json.id, 'the saved episode has an id');
  assert.equal(created.json.title, ep.title);
  assert.equal(created.json.date, ep.date);
  assert.equal(created.json.audioUrl, ep.audioUrl);
  assert.equal(created.json.durationSec, ep.durationSec);
  assert.equal(created.json.description, ep.description);
  assert.equal(created.json.createdBy, ep.createdBy);
  assert.ok(created.json.createdAt, 'the episode carries createdAt');
  assert.equal(await RadioEpisode.countDocuments(), 1);

  const list = await req('GET', '/radio/episodes');
  assert.equal(list.status, 200);
  assert.equal(list.json.episodes.length, 1);
  const entry = list.json.episodes[0];
  assert.equal(entry.id, created.json.id);
  assert.equal(entry.title, ep.title);
  assert.equal(entry.date, ep.date);
  assert.equal(entry.audioUrl, ep.audioUrl, 'list is FULL: the player needs audioUrl in the list');
  assert.equal(entry.description, ep.description, 'list is FULL: description rides along too');
  assert.equal(entry.durationSec, ep.durationSec);

  const got = await req('GET', `/radio/episodes/${created.json.id}`);
  assert.equal(got.status, 200);
  assert.equal(got.json.id, created.json.id);
  assert.equal(got.json.title, ep.title);
  assert.equal(got.json.audioUrl, ep.audioUrl);
  assert.equal(got.json.durationSec, ep.durationSec);
  assert.equal(got.json.description, ep.description);

  const removed = await req('DELETE', `/radio/episodes/${created.json.id}`);
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.json, { ok: true });
  assert.equal(await RadioEpisode.countDocuments(), 0);
  const gone = await req('GET', `/radio/episodes/${created.json.id}`);
  assert.equal(gone.status, 404);
});

test('list is newest-first: air date desc, then creation desc', async () => {
  // Created out of air-date order on purpose: the sort must follow
  // the DATE first, not the order episodes happened to be added.
  const older = await req('POST', '/radio/episodes', {
    ...sampleEpisode(),
    title: 'Older Show',
    date: '2026-11-07',
  });
  const newer = await req('POST', '/radio/episodes', {
    ...sampleEpisode(),
    title: 'Newer Show',
    date: '2026-11-14',
  });
  const sameDayLater = await req('POST', '/radio/episodes', {
    ...sampleEpisode(),
    title: 'Same-Day Bonus',
    date: '2026-11-14',
  });
  assert.equal(older.status, 201);
  assert.equal(newer.status, 201);
  assert.equal(sameDayLater.status, 201);
  const list = await req('GET', '/radio/episodes');
  assert.deepEqual(
    list.json.episodes.map((e) => e.title),
    ['Same-Day Bonus', 'Newer Show', 'Older Show'],
  );
});

test('optional fields default when omitted', async () => {
  const created = await req('POST', '/radio/episodes', {
    title: 'Bare Bones Episode',
    audioUrl: 'https://example.com/family-radio/bare.mp3',
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.date, '');
  assert.equal(created.json.durationSec, 0);
  assert.equal(created.json.description, '');
  assert.equal(created.json.createdBy, '');
});

test('validation: no title, blank title, no audioUrl → 400, nothing stored', async () => {
  const noTitle = await req('POST', '/radio/episodes', {
    audioUrl: 'https://example.com/family-radio/x.mp3',
  });
  assert.equal(noTitle.status, 400);
  const blankTitle = await req('POST', '/radio/episodes', {
    title: '   ',
    audioUrl: 'https://example.com/family-radio/x.mp3',
  });
  assert.equal(blankTitle.status, 400);
  const noAudio = await req('POST', '/radio/episodes', { title: 'Silent Episode' });
  assert.equal(noAudio.status, 400);
  assert.equal(await RadioEpisode.countDocuments(), 0);
});

test('the family-key gate applies to radio like every route', async () => {
  const res = await req('GET', '/radio/episodes', undefined, { 'x-family-key': 'wrong-key' });
  assert.equal(res.status, 401);
});

test('get and delete of a missing episode → 404', async () => {
  const got = await req('GET', '/radio/episodes/64b64c2f2f2f2f2f2f2f2f2f');
  assert.equal(got.status, 404);
  const removed = await req('DELETE', '/radio/episodes/64b64c2f2f2f2f2f2f2f2f2f');
  assert.equal(removed.status, 404);
  const malformed = await req('GET', '/radio/episodes/not-an-id');
  assert.equal(malformed.status, 404, 'a malformed id is a 404, not a 500');
});
