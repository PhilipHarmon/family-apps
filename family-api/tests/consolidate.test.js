const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseIngredient, buildShoppingList, DEFAULT_STAPLES } = require('../consolidate');

test('parseIngredient splits quantity, unit and name; strips parentheticals', () => {
  const p = parseIngredient('1.5 lb ground beef (80/20)');
  assert.equal(p.amount, 1.5);
  assert.equal(p.unit, 'lb');
  assert.equal(p.key, 'ground beef');
});

test('parseIngredient handles bare counts and quantity-free lines', () => {
  const buns = parseIngredient('8 burger buns');
  assert.equal(buns.amount, 8);
  assert.equal(buns.unit, '');
  assert.equal(buns.key, 'burger buns');
  const salt = parseIngredient('Salt');
  assert.equal(salt.amount, null);
  assert.equal(salt.key, 'salt');
  const can = parseIngredient('1 (14 oz) can diced tomatoes');
  assert.equal(can.amount, 1);
  assert.equal(can.unit, 'can');
  assert.equal(can.key, 'diced tomatoes');
});

test('same key + same unit sums quantities and merges meals', () => {
  const { items, excluded } = buildShoppingList(
    [
      { line: '1 lb chicken thighs', meal: 'Roast Chicken' },
      { line: '1 lb chicken thighs', meal: 'Chicken Soup' },
    ],
    [],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, '2 lbs');
  assert.equal(items[0].display, '2 lbs chicken thighs');
  assert.deepEqual(items[0].meals, ['Roast Chicken', 'Chicken Soup']);
  assert.equal(excluded.length, 0);
});

test('same key + different units never fabricates a total — variants noted', () => {
  const { items } = buildShoppingList(
    [
      { line: '1 lb chicken thighs', meal: 'A' },
      { line: '8 oz chicken thighs', meal: 'B' },
    ],
    [],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, null);
  assert.deepEqual(items[0].variants, ['1 lb', '8 oz']);
  assert.match(items[0].display, /chicken thighs — 1 lb \+ 8 oz/);
});

test('staples are excluded (and revealable), matching whole names only', () => {
  const { items, excluded } = buildShoppingList(
    [
      { line: 'Salt', meal: 'A' },
      { line: '2 tbsp flour', meal: 'A' },
      { line: '1 egg', meal: 'A' },
      { line: '2 bell peppers', meal: 'A' },
      { line: '1 lb chicken thighs', meal: 'A' },
    ],
    DEFAULT_STAPLES,
  );
  const itemNames = items.map((i) => i.name);
  assert.ok(itemNames.includes('bell peppers'), 'bell peppers must NOT be swallowed by the "pepper" staple');
  assert.ok(itemNames.includes('chicken thighs'));
  const excludedNames = excluded.map((i) => i.name.toLowerCase());
  assert.ok(excludedNames.includes('salt'));
  assert.ok(excludedNames.includes('flour'));
  assert.ok(excludedNames.includes('egg'), 'singular "egg" matches the "eggs" staple');
});

test('unquantified duplicates collapse to one line with both meals', () => {
  const { items } = buildShoppingList(
    [
      { line: 'Cheese slices', meal: 'Burgers' },
      { line: 'Cheese slices', meal: 'Melts' },
    ],
    [],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].display, 'Cheese slices');
  assert.deepEqual(items[0].meals, ['Burgers', 'Melts']);
});
