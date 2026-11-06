const { test } = require('node:test');
const assert = require('node:assert/strict');
const { proposeTags, parseTimeMinutes } = require('../tagRules');

const tagsOf = (recipe) => Object.fromEntries(proposeTags(recipe).map((p) => [p.tag, p.confidence]));

test('crockpot signalled by time field and steps is high confidence', () => {
  const tags = tagsOf({
    name: 'Turkey Meatballs in Gravy',
    time: '4h (crockpot, low)',
    ingredients: ['Ground turkey', 'Egg noodles'],
    steps: ['Roll into balls and drop them into the crockpot.', 'Cook on low for 4 hours.'],
  });
  assert.equal(tags.crockpot, 'high');
  assert.equal(tags['30-min'], undefined, 'a 4h recipe is not a 30-min recipe');
});

test('a ~30 min time field earns the 30-min tag', () => {
  const tags = tagsOf({ name: 'Smash Burgers', time: '~30 min', ingredients: [], steps: [] });
  assert.equal(tags['30-min'], 'high');
});

test('taco-night from the name; vegetarian only as a medium inference', () => {
  const tags = tagsOf({
    name: 'Black Bean & Corn Burritos',
    time: '~25 min',
    ingredients: ['Black beans', 'Corn', 'Tortillas'],
    steps: [],
  });
  assert.equal(tags['taco-night'], 'high');
  assert.equal(tags.vegetarian, 'medium', 'vegetarian is an inference — never high confidence');
});

test('parseTimeMinutes reads the shapes the library actually uses', () => {
  assert.equal(parseTimeMinutes('~30 min'), 30);
  assert.equal(parseTimeMinutes('4h (crockpot, low)'), 240);
  assert.equal(parseTimeMinutes('1 hr 15 min'), 75);
  assert.equal(parseTimeMinutes(''), null);
  assert.equal(parseTimeMinutes('a while'), null);
});
