import test from 'node:test';
import assert from 'node:assert/strict';

import { mulberry32, buildCards, buildBriefing } from '../src/lib/generate.js';
import {
  SCENE_KEYS,
  sceneForMission,
  assemblePages,
  assembleBook,
  clampPageIndex,
  turnPage,
  isFirstPage,
  isLastPage,
} from '../src/lib/storybook.js';
import { FAMILY } from '../src/data/family.js';

// A real completed-mission fixture: run the app's own generator with a
// seeded rng, then "complete" the mission having found only some items.
function completedMission({ foundFraction = 0.6, seed = 7 } = {}) {
  const rng = mulberry32(seed);
  const picks = { setting: 'nature', duration: 'afternoon', drive: 'short', cost: 'free' };
  const cards = buildCards(picks, rng, { A: [], B: [], C: [] });
  const briefing = buildBriefing(cards.B, FAMILY, {}, rng);
  const allItems = [
    ...briefing.hunt.easy,
    ...briefing.hunt.standard,
    ...briefing.hunt.expert,
  ].map((i) => i.t);
  const foundCount = Math.max(1, Math.floor(allItems.length * foundFraction));
  const checked = allItems.slice(0, foundCount);
  const missed = allItems.slice(foundCount);
  return {
    mission: {
      briefing,
      checked,
      startedAt: '2026-11-07T14:00:00.000Z',
      completedAt: '2026-11-07T16:30:00.000Z',
    },
    allItems,
    checked,
    missed,
  };
}

test('book follows the fixed page order: cover, call, quest…, completion', () => {
  const { mission } = completedMission();
  const pages = assemblePages(mission);
  assert.equal(pages[0].type, 'cover');
  assert.equal(pages[1].type, 'call');
  assert.equal(pages[pages.length - 1].type, 'completion');
  const quests = pages.filter((p) => p.type === 'quest');
  assert.ok(quests.length >= 1 && quests.length <= 3, `expected 1–3 quest pages, got ${quests.length}`);
  assert.equal(pages.length, quests.length + 3, 'no photos page without photos');
});

test('every page honors the contract: known illustration, 2–4 lines on story pages', () => {
  const { mission } = completedMission();
  const pages = assemblePages(mission, ['https://example.test/a.jpg']);
  for (const page of pages) {
    assert.ok(SCENE_KEYS.includes(page.illustration), `bad scene key ${page.illustration}`);
    assert.ok(Array.isArray(page.lines) && page.lines.length >= 1, `${page.type} page needs lines`);
    if (page.type !== 'photos') {
      assert.ok(page.lines.length >= 2 && page.lines.length <= 4,
        `${page.type} page should carry 2–4 read-aloud lines, got ${page.lines.length}`);
    }
  }
});

test('only found items appear — unfound items are never mentioned', () => {
  const { mission, checked, missed } = completedMission({ foundFraction: 0.5 });
  assert.ok(missed.length > 0, 'fixture must leave some items unfound');
  const pages = assemblePages(mission);
  const mentioned = pages.flatMap((p) => p.items || []);
  assert.deepEqual([...mentioned].sort(), [...checked].sort(), 'quest pages list exactly the found items');
  const wholeBook = JSON.stringify(pages);
  for (const item of missed) {
    assert.ok(!wholeBook.includes(item), `unfound item leaked into the book: ${item}`);
  }
});

test('every hero is in the book: the cover names each role', () => {
  const { mission } = completedMission();
  const cover = assemblePages(mission)[0];
  const coverText = `${cover.title} ${cover.lines.join(' ')}`;
  for (const role of mission.briefing.roles) {
    assert.ok(coverText.includes(role.name), `cover missing ${role.name}`);
    assert.ok(coverText.includes(role.roleTitle), `cover missing role ${role.roleTitle}`);
  }
});

test('photos page appears only with photos, and carries the refs verbatim', () => {
  const { mission } = completedMission();
  const refs = ['https://example.test/1.jpg', { imageUrl: 'https://example.test/2.jpg' }];
  const withPhotos = assemblePages(mission, refs);
  const last = withPhotos[withPhotos.length - 1];
  assert.equal(last.type, 'photos');
  assert.deepEqual(last.photos, refs);
  const without = assemblePages(mission);
  assert.ok(!without.some((p) => p.type === 'photos'));
});

test('assembleBook wraps pages with shelf fields', () => {
  const { mission } = completedMission();
  const book = assembleBook(mission);
  assert.equal(book.title, mission.briefing.title);
  assert.equal(book.date, mission.completedAt);
  assert.equal(book.crew.length, mission.briefing.roles.length);
  assert.equal(book.pages.length, assemblePages(mission).length);
});

test('scene mapping: settings land on their home scenes, places can override', () => {
  assert.equal(sceneForMission({ setting: 'nature', placeName: null }), 'woods');
  assert.equal(sceneForMission({ setting: 'neighborhood', placeName: null }), 'neighborhood');
  assert.equal(sceneForMission({ setting: 'downtown', placeName: null }), 'museum');
  assert.equal(sceneForMission({ setting: 'home', placeName: null }), 'backyard');
  assert.equal(sceneForMission({ setting: 'nature', placeName: 'Pullen Park' }), 'park');
  assert.equal(sceneForMission({ setting: 'downtown', placeName: 'Museum of Life and Science' }), 'museum');
});

test('reader navigation never runs off either end', () => {
  const n = 6;
  assert.equal(clampPageIndex(-3, n), 0);
  assert.equal(clampPageIndex(99, n), n - 1);
  assert.equal(clampPageIndex(2.9, n), 2);
  assert.equal(clampPageIndex(3, 0), 0);
  assert.equal(turnPage(0, -1, n), 0, 'cannot turn back from the cover');
  assert.equal(turnPage(n - 1, 1, n), n - 1, 'cannot turn past the end');
  assert.equal(turnPage(2, 1, n), 3);
  assert.equal(turnPage(2, -1, n), 1);
  assert.ok(isFirstPage(0) && !isFirstPage(1));
  assert.ok(isLastPage(n - 1, n) && !isLastPage(n - 2, n));
});
