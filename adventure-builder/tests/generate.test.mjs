import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mulberry32,
  buildCards,
  rerollCard,
  buildBriefing,
  assignRoles,
  buildHunt,
  placeDriveTier,
  costAllowed,
  DRIVE_RANK,
} from '../src/lib/generate.js';
import { MISSIONS } from '../src/data/missions.js';
import { HUNTS } from '../src/data/hunts.js';
import { ROLES } from '../src/data/roles.js';
import { PLACES } from '../src/data/places.js';
import { FAMILY } from '../src/data/family.js';

const SETTINGS = ['nature', 'neighborhood', 'downtown', 'home'];
const DURATIONS = ['quick', 'afternoon', 'allday'];
const DRIVES = ['here', 'short', 'far'];
const COSTS = ['free', 'few'];

const [philip, jessica, wyatt, pepper, briar] = FAMILY;
const MIXES = {
  fullFamily: FAMILY,
  grownupsOnly: [philip, jessica],
  littleCrew: [philip, briar],
  bigKids: [jessica, wyatt, pepper],
  soloDad: [philip],
  bigGroup: [
    ...FAMILY,
    { id: 'nana', name: 'Nana', band: 'grownup', color: '#000' },
    { id: 'cousin1', name: 'Cousin A', band: 'mid', color: '#111' },
    { id: 'cousin2', name: 'Cousin B', band: 'little', color: '#222' },
  ],
};

// ---------- content library shape ----------

test('missions library: at least 14 templates, all fully formed', () => {
  assert.ok(MISSIONS.length >= 14, `only ${MISSIONS.length} missions`);
  for (const m of MISSIONS) {
    assert.ok(m.title && m.pitch && m.intro, `${m.id} missing text`);
    assert.ok(m.settings.length && m.durations.length && m.drives.length && m.costs.length, `${m.id} missing filter tags`);
    assert.ok(m.steps.length >= 3 && m.steps.length <= 6, `${m.id} steps ${m.steps.length}`);
    assert.ok(m.bring.length >= 3, `${m.id} bring list too short`);
    assert.ok(m.intro.length > 80, `${m.id} intro too thin`);
  }
});

test('hunt banks: at least 20 items per setting across all bands', () => {
  for (const s of SETTINGS) {
    const bank = HUNTS[s];
    assert.ok(bank && bank.length >= 20, `${s} bank has ${bank?.length}`);
    for (const band of ['little', 'mid', 'big', 'grownup']) {
      assert.ok(bank.some((i) => i.band === band), `${s} bank missing band ${band}`);
    }
  }
});

test('roles library: at least 12 roles, each with a task for every band', () => {
  assert.ok(ROLES.length >= 12, `only ${ROLES.length} roles`);
  for (const r of ROLES) {
    for (const band of ['grownup', 'big', 'mid', 'little']) {
      assert.ok(r.tasks[band] && r.tasks[band].length > 20, `${r.id} missing ${band} task`);
    }
  }
});

test('places bank: at least 12 real places with honest fields', () => {
  assert.ok(PLACES.length >= 12, `only ${PLACES.length} places`);
  for (const p of PLACES) {
    assert.ok(p.name && p.area && p.note.length > 30, `${p.id} thin data`);
    assert.ok(SETTINGS.includes(p.setting), `${p.id} bad setting`);
    assert.ok(p.driveMinutes > 0 && p.driveMinutes <= 90, `${p.id} drive minutes`);
    assert.ok(['free', '$', '$$'].includes(p.cost), `${p.id} cost tier`);
    assert.ok(p.durations.length >= 1, `${p.id} durations`);
  }
});

// ---------- card rules ----------

test('card A is always invented, free, and no-travel; card C always respects cost', () => {
  const rng = mulberry32(42);
  for (const setting of SETTINGS) for (const duration of DURATIONS) for (const drive of DRIVES) for (const cost of COSTS) {
    const picks = { setting, duration, drive, cost };
    const cards = buildCards(picks, rng);
    assert.equal(cards.A.drive, 'here', `A drive ${JSON.stringify(picks)}`);
    assert.equal(cards.A.cost, 'free', `A cost ${JSON.stringify(picks)}`);
    assert.equal(cards.A.invented, true);
    const missionA = MISSIONS.find((m) => m.id === cards.A.missionId);
    assert.ok(missionA.durations.includes(cards.A.duration), 'A claims a duration its mission cannot do');
    // Card C: cost is never relaxed
    if (cards.C.placeId) {
      const place = PLACES.find((p) => p.id === cards.C.placeId);
      assert.ok(costAllowed(place.cost, cost), `C cost violated: ${place.name} for pick ${cost}`);
    }
  }
});

test('card B respects drive and cost limits whenever it uses a real place', () => {
  const rng = mulberry32(7);
  for (const setting of SETTINGS) for (const duration of DURATIONS) for (const drive of DRIVES) for (const cost of COSTS) {
    const picks = { setting, duration, drive, cost };
    const { B } = buildCards(picks, rng);
    if (!B.placeId) {
      assert.equal(B.fallback, true, 'placeless card B must be labeled as the fallback');
      continue;
    }
    const place = PLACES.find((p) => p.id === B.placeId);
    assert.equal(place.setting, setting, `B place setting mismatch for ${JSON.stringify(picks)}`);
    assert.ok(
      DRIVE_RANK[placeDriveTier(place)] <= DRIVE_RANK[drive],
      `B place ${place.name} is beyond drive pick ${drive}`,
    );
    assert.ok(costAllowed(place.cost, cost), `B place ${place.name} breaks cost pick ${cost}`);
  }
});

test('card B falls back honestly when the drive pick is "right here"', () => {
  const rng = mulberry32(3);
  const { B } = buildCards({ setting: 'nature', duration: 'afternoon', drive: 'here', cost: 'free' }, rng);
  assert.equal(B.placeId, null);
  assert.equal(B.fallback, true);
});

// ---------- briefing invariants across the whole grid ----------

test('generator survives every pick combination × group mix, roles always complete', () => {
  let seed = 100;
  for (const setting of SETTINGS) for (const duration of DURATIONS) for (const drive of DRIVES) for (const cost of COSTS) {
    for (const [mixName, crew] of Object.entries(MIXES)) {
      const rng = mulberry32(seed++);
      const picks = { setting, duration, drive, cost };
      const cards = buildCards(picks, rng);
      for (const card of [cards.A, cards.B, cards.C]) {
        const briefing = buildBriefing(card, crew, {}, rng);
        // Exactly one role per participant, nobody twice, nobody missing.
        assert.equal(briefing.roles.length, crew.length, `${mixName} role count`);
        assert.deepEqual(
          briefing.roles.map((r) => r.personId).sort(),
          crew.map((p) => p.id).sort(),
          `${mixName} role assignment`,
        );
        assert.ok(briefing.roles.every((r) => r.roleTitle && r.task), 'role text present');
        assert.ok(briefing.intro.length > 50 && briefing.steps.length >= 3, 'briefing body present');
        // Hunt items really come from the right setting bank.
        const bankTexts = new Set(HUNTS[briefing.setting].map((i) => i.t));
        for (const group of ['easy', 'standard', 'expert']) {
          for (const item of briefing.hunt[group]) {
            assert.ok(bankTexts.has(item.t), `hunt item from wrong bank: ${item.t}`);
          }
        }
      }
    }
  }
});

test('hunt list fits the crew: little kids get easy items, big kids get expert challenges', () => {
  const rng = mulberry32(9);
  for (const setting of SETTINGS) {
    const withLittle = buildHunt(setting, 'afternoon', [philip, briar], rng);
    assert.ok(withLittle.easy.length >= 3, `${setting}: no easy items for the little band`);
    assert.ok(withLittle.easy.every((i) => i.band === 'little'), `${setting}: easy items must be little-band`);

    const withBig = buildHunt(setting, 'afternoon', [jessica, wyatt], rng);
    assert.ok(withBig.expert.length >= 2 && withBig.expert.length <= 3, `${setting}: expert count ${withBig.expert.length}`);
    assert.ok(withBig.expert.every((i) => i.band === 'big'), `${setting}: expert items must be big-band`);

    const grownups = buildHunt(setting, 'afternoon', [philip, jessica], rng);
    assert.equal(grownups.easy.length, 0, 'no little kid, no easy section');
    assert.equal(grownups.expert.length, 0, 'no big kid, no expert section');
    assert.ok(grownups.standard.length >= 10, 'grown-ups still get a real hunt');
  }
});

// ---------- rotation & reroll ----------

test('roles rotate: nobody repeats their last-adventure role when alternatives exist', () => {
  const rng = mulberry32(11);
  const first = assignRoles(FAMILY, {}, rng);
  const history = Object.fromEntries(first.map((r) => [r.personId, r.roleId]));
  for (let round = 0; round < 25; round += 1) {
    const next = assignRoles(FAMILY, history, mulberry32(1000 + round));
    for (const r of next) {
      assert.notEqual(r.roleId, history[r.personId], `${r.name} repeated ${r.roleId}`);
    }
  }
});

test('reroll avoids the currently shown card when alternatives exist', () => {
  const picks = { setting: 'nature', duration: 'afternoon', drive: 'short', cost: 'free' };
  const cards = buildCards(picks, mulberry32(5));
  for (let i = 0; i < 10; i += 1) {
    const fresh = rerollCard('A', picks, mulberry32(50 + i), { A: [], B: [], C: [] }, cards.A.key);
    assert.notEqual(fresh.key, cards.A.key, 'reroll returned the same card A');
  }
  const picksB = { setting: 'downtown', duration: 'afternoon', drive: 'short', cost: 'few' };
  const cardsB = buildCards(picksB, mulberry32(6));
  assert.ok(cardsB.B.placeId, 'expected a real place for downtown/short/few');
  for (let i = 0; i < 10; i += 1) {
    const fresh = rerollCard('B', picksB, mulberry32(90 + i), { A: [], B: [], C: [] }, cardsB.B.key);
    assert.notEqual(fresh.key, cardsB.B.key, 'reroll returned the same card B');
  }
});
