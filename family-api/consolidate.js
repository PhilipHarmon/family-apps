// Shopping-list consolidation engine (Dinner System Phase 1, spec §8).
// ONE implementation, shared by GET /weeks/:weekStart/shopping-list
// (and, later, the What's For Dinner Grocery tab upgrade).
//
// Pipeline per spec:
//   1. collect ingredient lines from every kind:'recipe' day
//      (the route does this; custom days contribute nothing)
//   2. normalise for the merge key: lowercase -> strip parentheticals
//      -> collapse whitespace -> strip a leading quantity+unit token
//   3. merge same keys; quantities sum ONLY when every occurrence
//      carries a simple numeric amount in the SAME unit — otherwise
//      the line appears once with its variants noted
//   4. pantry staples are excluded into their own list, never dropped
//      silently: the caller can always reveal what was held back
//
// HONESTY RULE (spec §8, from v1): free-text ingredient lines cannot
// be merged more aggressively without inventing totals. This engine
// never fabricates a quantity: no unit conversion (lb never becomes
// oz), no guessing at "some" or "a pinch", no splitting names.

// Fred's proposed seed for the PantryStaples singleton (spec §3.4).
// Family-editable via PUT /pantry-staples.
const DEFAULT_STAPLES = [
  'salt',
  'pepper',
  'black pepper',
  'oil',
  'olive oil',
  'vegetable oil',
  'flour',
  'sugar',
  'garlic powder',
  'onion powder',
  'paprika',
  'italian seasoning',
  'butter',
  'milk',
  'eggs',
];

// Lowercase, strip parentheticals, collapse whitespace. The key form
// of an ingredient NAME (quantity already removed — see parse).
function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNIT_PLURALS = {
  lb: 'lbs',
  cup: 'cups',
  can: 'cans',
  clove: 'cloves',
  bunch: 'bunches',
  head: 'heads',
  stalk: 'stalks',
  slice: 'slices',
  pack: 'packs',
  package: 'packages',
  jar: 'jars',
  bottle: 'bottles',
  bag: 'bags',
  box: 'boxes',
  piece: 'pieces',
};
const UNIT_SINGULARS = Object.fromEntries(
  Object.entries(UNIT_PLURALS).map(([s, p]) => [p, s]),
);
const UNITS = new Set([
  'tbsp', 'tsp', 'oz', 'g', 'kg', 'ml', 'l',
  ...Object.keys(UNIT_PLURALS),
  ...Object.keys(UNIT_SINGULARS),
]);

function canonicalUnit(u) {
  if (!u) return '';
  return UNIT_SINGULARS[u] || u;
}

function displayUnit(canonical, amount) {
  if (!canonical) return '';
  if (amount === 1) return canonical;
  return UNIT_PLURALS[canonical] || canonical;
}

function amountValue(text) {
  const t = String(text).trim();
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(t);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(n) {
  if (Number.isInteger(n)) return String(n);
  const whole = Math.floor(n);
  const frac = n - whole;
  const quarters = [[0.25, '1/4'], [0.5, '1/2'], [0.75, '3/4']];
  for (const [v, label] of quarters) {
    if (Math.abs(frac - v) < 0.01) return whole > 0 ? `${whole} ${label}` : label;
  }
  return String(Math.round(n * 100) / 100);
}

// Split one free-text ingredient line into { name, key, amount, unit,
// raw }. `amount` is a number or null (no parseable leading quantity);
// `unit` is canonical singular ('' for a bare count / no unit).
function parseIngredient(line) {
  const raw = String(line || '').trim();
  const flat = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const m = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/.exec(flat);
  if (m) {
    const amount = amountValue(m[1]);
    let rest = m[2] || '';
    let unit = '';
    const um = /^([A-Za-z]+)\.?\s+(.*)$/.exec(rest);
    if (um && UNITS.has(um[1].toLowerCase())) {
      unit = canonicalUnit(um[1].toLowerCase());
      rest = um[2];
    }
    if (amount !== null && rest) {
      return { raw, name: rest, key: normalizeText(rest), amount, unit };
    }
  }
  return { raw, name: flat, key: normalizeText(flat), amount: null, unit: '' };
}

function quantityText(amount, unit) {
  const u = displayUnit(unit, amount);
  return u ? `${formatAmount(amount)} ${u}` : formatAmount(amount);
}

// Singular-fold for staple comparison only: 'eggs' ~ 'egg'. Applied
// to both sides, and staple matching is whole-key equality — never a
// substring test — so 'bell pepper' can never match 'pepper'.
function foldKey(key) {
  return key.endsWith('s') && key.length > 3 ? key.slice(0, -1) : key;
}

function consolidateGroup(group) {
  const occ = group.occurrences;
  const base = { name: group.name, meals: group.meals };
  if (occ.length === 1) {
    const o = occ[0];
    return {
      ...base,
      display: o.raw,
      quantity: o.amount !== null ? quantityText(o.amount, o.unit) : null,
      variants: [],
    };
  }
  const allQty = occ.every((o) => o.amount !== null);
  const sameUnit = new Set(occ.map((o) => o.unit)).size === 1;
  if (allQty && sameUnit) {
    const sum = occ.reduce((a, o) => a + o.amount, 0);
    const q = quantityText(sum, occ[0].unit);
    return { ...base, display: `${q} ${group.name}`.trim(), quantity: q, variants: [] };
  }
  if (!occ.some((o) => o.amount !== null)) {
    // No occurrence carries a quantity — there is nothing to vary.
    return { ...base, display: occ[0].raw, quantity: null, variants: [] };
  }
  const descriptors = [];
  for (const o of occ) {
    if (o.amount === null) continue;
    const d = quantityText(o.amount, o.unit);
    if (!descriptors.includes(d)) descriptors.push(d);
  }
  return {
    ...base,
    display: `${group.name} — ${descriptors.join(' + ')}`,
    quantity: null,
    variants: descriptors,
  };
}

// entries: [{ line, meal }] — every ingredient line of every planned
// recipe, tagged with the recipe's name. staples: [names] (any form;
// normalised here). Returns { items, excluded }, each a list of
// { name, display, quantity, variants, meals } sorted by name.
function buildShoppingList(entries, staples) {
  const stapleKeys = new Set((staples || []).map((s) => foldKey(normalizeText(s))));
  const groups = new Map();
  for (const { line, meal } of entries || []) {
    const p = parseIngredient(line);
    if (!p.key) continue;
    if (!groups.has(p.key)) {
      groups.set(p.key, { key: p.key, name: p.name, occurrences: [], meals: [] });
    }
    const g = groups.get(p.key);
    g.occurrences.push(p);
    if (meal && !g.meals.includes(meal)) g.meals.push(meal);
  }
  const items = [];
  const excluded = [];
  for (const g of groups.values()) {
    const line = consolidateGroup(g);
    if (stapleKeys.has(foldKey(g.key))) excluded.push(line);
    else items.push(line);
  }
  const byName = (a, b) => a.name.localeCompare(b.name);
  items.sort(byName);
  excluded.sort(byName);
  return { items, excluded };
}

module.exports = {
  DEFAULT_STAPLES,
  normalizeText,
  parseIngredient,
  buildShoppingList,
  formatAmount,
};
