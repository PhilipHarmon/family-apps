// The Adventure Builder generator. Pure functions only — no storage, no
// browser APIs — so the whole thing is unit-testable. The app passes in a
// random source, who's coming, the family's picks, and what was shown or
// assigned last time; the generator hands back three option cards and, for
// the chosen card, a full mission briefing.

import { MISSIONS } from '../data/missions.js';
import { HUNTS } from '../data/hunts.js';
import { ROLES } from '../data/roles.js';
import { PLACES } from '../data/places.js';

// ---------- small utilities ----------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Pick one item, avoiding keys in `avoid` when any alternative exists.
function choose(items, rng, avoid, keyOf) {
  if (!items.length) return null;
  const fresh = items.filter((it) => !avoid.includes(keyOf(it)));
  const pool = fresh.length ? fresh : items;
  return pool[Math.floor(rng() * pool.length)];
}

// ---------- filter rules ----------

export const DRIVE_RANK = { here: 0, short: 1, far: 2 };

export function placeDriveTier(place) {
  return place.driveMinutes <= 20 ? 'short' : 'far';
}

// 'free' picks mean truly free; 'few' ("a few bucks") allows free and $.
export function costAllowed(placeCost, costPick) {
  if (costPick === 'free') return placeCost === 'free';
  return placeCost === 'free' || placeCost === '$';
}

const PLACE_FALLBACK = {
  nature: 'the great outdoors',
  neighborhood: 'the neighborhood',
  downtown: 'downtown Raleigh',
  home: 'home base',
};
const AREA_FALLBACK = {
  nature: 'the wilds',
  neighborhood: 'the neighborhood',
  downtown: 'downtown',
  home: 'the house',
};

function fillTokens(text, place, setting) {
  return text
    .replaceAll('{place}', place ? place.name : PLACE_FALLBACK[setting] || 'out there')
    .replaceAll('{area}', place ? place.area : AREA_FALLBACK[setting] || 'the area');
}

// A mission template that can wrap a real place for this setting, preferring
// one that fits the duration.
function templateForPlace(setting, duration, rng, avoidIds = []) {
  let pool = MISSIONS.filter((m) => m.placeFriendly && m.settings.includes(setting));
  const durPool = pool.filter((m) => m.durations.includes(duration));
  if (durPool.length) pool = durPool;
  if (!pool.length) pool = MISSIONS.filter((m) => m.placeFriendly);
  return choose(pool, rng, avoidIds, (m) => m.id) || pool[0] || MISSIONS[0];
}

// An invented (no-travel, always free) mission. Cascades through pools so it
// never comes back empty; the returned card carries the duration/setting the
// mission can honestly claim.
function inventedMission(picks, rng, avoidIds = []) {
  const base = MISSIONS.filter((m) => m.drives.includes('here') && m.costs.includes('free'));
  const cascades = [
    base.filter((m) => m.settings.includes(picks.setting) && m.durations.includes(picks.duration)),
    base.filter((m) => m.durations.includes(picks.duration)),
    base.filter((m) => m.settings.includes(picks.setting)),
    base,
  ];
  const pool = cascades.find((c) => c.length) || base;
  const mission = choose(pool, rng, avoidIds, (m) => m.id) || pool[0];
  return mission;
}

function inventedCard(kind, picks, rng, recentKeys, extra = {}) {
  const mission = inventedMission(picks, rng, recentKeysToMissionIds(recentKeys));
  const setting = mission.settings.includes(picks.setting) ? picks.setting : mission.settings[0];
  const duration = mission.durations.includes(picks.duration)
    ? picks.duration
    : mission.durations[mission.durations.length - 1];
  return {
    kind,
    key: `${kind}:${mission.id}:none`,
    missionId: mission.id,
    placeId: null,
    title: mission.title,
    pitch: mission.pitch,
    setting,
    duration,
    drive: 'here',
    cost: 'free',
    invented: true,
    fallback: false,
    ...extra,
  };
}

function placeCard(kind, place, picks, rng, recentKeys, durationOverride) {
  const duration = durationOverride
    || (place.durations.includes(picks.duration)
      ? picks.duration
      : place.durations[place.durations.length - 1]);
  const mission = templateForPlace(place.setting, duration, rng, recentKeysToMissionIds(recentKeys));
  return {
    kind,
    key: `${kind}:${mission.id}:${place.id}`,
    missionId: mission.id,
    placeId: place.id,
    title: `${mission.title} — at ${place.name}`,
    pitch: place.note,
    setting: place.setting,
    duration,
    drive: placeDriveTier(place),
    cost: place.cost,
    invented: false,
    fallback: false,
  };
}

function recentKeysToMissionIds(keys) {
  return (keys || []).map((k) => String(k).split(':')[1]).filter(Boolean);
}

// ---------- the three option cards ----------

export function buildCards(picks, rng = Math.random, recent = { A: [], B: [], C: [] }) {
  // Card A — Right Now, Free: invented, no travel, always free.
  const A = inventedCard('A', picks, rng, recent.A || []);

  // Card B — Out & About: a real place inside the chosen drive/cost limits,
  // or an honestly-labeled invented fallback when nothing matches.
  let B = null;
  if (picks.drive !== 'here') {
    let pool = PLACES.filter(
      (p) => p.setting === picks.setting
        && DRIVE_RANK[placeDriveTier(p)] <= DRIVE_RANK[picks.drive]
        && costAllowed(p.cost, picks.cost),
    );
    const durPool = pool.filter((p) => p.durations.includes(picks.duration));
    if (durPool.length) pool = durPool;
    if (pool.length) {
      const place = choose(pool, rng, (recent.B || []).map((k) => String(k).split(':')[2]), (p) => p.id);
      B = placeCard('B', place, picks, rng, recent.B || []);
    }
  }
  if (!B) {
    B = inventedCard('B', picks, rng, recent.B || [], {
      fallback: true,
      pitch: 'Made-up mission — no real spot matched those picks, so this one is pure imagination. Your favorite park, greenway or patch of woods is the stage.',
    });
  }

  // Card C — Worth the Drive: the big-swing destination. Drive limit relaxed
  // on purpose (that's the card's whole point); cost still respected.
  let poolC = PLACES.filter((p) => costAllowed(p.cost, picks.cost));
  const farPool = poolC.filter((p) => placeDriveTier(p) === 'far');
  if (farPool.length) poolC = farPool;
  const settingPool = poolC.filter((p) => p.setting === picks.setting);
  if (settingPool.length) poolC = settingPool;
  const placeC = choose(poolC, rng, (recent.C || []).map((k) => String(k).split(':')[2]), (p) => p.id)
    || poolC[0];
  const C = placeCard('C', placeC, picks, rng, recent.C || []);

  return { A, B, C };
}

// Reroll one card: same rules, but the currently-shown (and recently-shown)
// options are excluded whenever an alternative exists.
export function rerollCard(kind, picks, rng, recent, currentKey) {
  const merged = {
    A: [...(recent.A || [])],
    B: [...(recent.B || [])],
    C: [...(recent.C || [])],
  };
  if (currentKey) merged[kind] = [...merged[kind], currentKey];
  return buildCards(picks, rng, merged)[kind];
}

// ---------- roles ----------

// Every participant gets exactly one role. The assignment is history-aware:
// nobody draws the role they had on their last adventure when another role
// is available.
export function assignRoles(participants, roleHistory = {}, rng = Math.random) {
  const deck = shuffle(ROLES, rng);
  const used = new Set();
  return participants.map((p, i) => {
    const role = deck.find((r) => !used.has(r.id) && roleHistory[p.id] !== r.id)
      || deck.find((r) => !used.has(r.id))
      || deck[i % deck.length];
    used.add(role.id);
    return {
      personId: p.id,
      name: p.name,
      band: p.band,
      color: p.color,
      roleId: role.id,
      roleTitle: role.title,
      emoji: role.emoji,
      task: role.tasks[p.band] || role.tasks.grownup,
    };
  });
}

// ---------- scavenger hunt ----------

const HUNT_TOTALS = { quick: 8, afternoon: 12, allday: 15 };

// Builds the checklist for the group's actual age mix: little kids in the
// crew guarantee easy spot-and-point items; a big kid guarantees 2–3 expert
// challenges; grown-up-fun items fold into the standard list.
export function buildHunt(setting, duration, participants, rng = Math.random) {
  const bank = HUNTS[setting] || HUNTS.neighborhood;
  const pool = (band) => shuffle(bank.filter((i) => i.band === band), rng);
  const littles = pool('little');
  const bigs = pool('big');
  const standardPool = shuffle([...pool('mid'), ...pool('grownup')], rng);

  const hasLittle = participants.some((p) => p.band === 'little');
  const hasBig = participants.some((p) => p.band === 'big');
  const total = HUNT_TOTALS[duration] || 12;

  const easy = hasLittle ? littles.slice(0, duration === 'quick' ? 3 : 4) : [];
  const expert = hasBig ? bigs.slice(0, duration === 'quick' ? 2 : 3) : [];
  const standard = standardPool.slice(0, Math.max(0, total - easy.length - expert.length));
  return { easy, standard, expert };
}

// ---------- the mission briefing ----------

export function buildBriefing(card, participants, roleHistory = {}, rng = Math.random) {
  const mission = MISSIONS.find((m) => m.id === card.missionId) || MISSIONS[0];
  const place = card.placeId ? PLACES.find((p) => p.id === card.placeId) || null : null;
  const roles = assignRoles(participants, roleHistory, rng);
  const hunt = buildHunt(card.setting, card.duration, participants, rng);
  return {
    title: card.title,
    pitch: card.pitch,
    setting: card.setting,
    duration: card.duration,
    drive: card.drive,
    cost: card.cost,
    invented: card.invented,
    fallback: card.fallback,
    placeName: place ? place.name : null,
    placeArea: place ? place.area : null,
    intro: fillTokens(mission.intro, place, card.setting),
    steps: mission.steps.map((s) => fillTokens(s, place, card.setting)),
    bring: [...new Set(mission.bring)],
    roles,
    hunt,
  };
}
