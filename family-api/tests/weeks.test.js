const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidWeekStart,
  sundayOfWeek,
  currentWeekStart,
  dateOfDay,
} = require('../weeks');

test('sundayOfWeek finds the Sunday of a Fri Nov 6 2026 week', () => {
  assert.equal(sundayOfWeek('2026-11-06'), '2026-11-01');
  assert.equal(sundayOfWeek('2026-11-01'), '2026-11-01', 'a Sunday maps to itself');
  assert.equal(sundayOfWeek('2026-11-07'), '2026-11-01', 'Saturday belongs to the same week');
});

test('isValidWeekStart accepts real Sundays only', () => {
  assert.equal(isValidWeekStart('2026-11-08'), true);
  assert.equal(isValidWeekStart('2026-11-09'), false, 'a Monday is not a week start');
  assert.equal(isValidWeekStart('2026-02-30'), false, 'not a real date');
  assert.equal(isValidWeekStart('junk'), false);
  assert.equal(isValidWeekStart('2026-1-8'), false, 'strict YYYY-MM-DD');
});

test('dateOfDay lands on the right calendar dates', () => {
  assert.equal(dateOfDay('2026-11-08', 'sun'), '2026-11-08');
  assert.equal(dateOfDay('2026-11-08', 'wed'), '2026-11-11');
  assert.equal(dateOfDay('2026-11-08', 'sat'), '2026-11-14');
  assert.equal(dateOfDay('2026-11-08', 'funday'), null);
});

test('currentWeekStart agrees with sundayOfWeek', () => {
  const fri = new Date(Date.UTC(2026, 10, 6, 17, 0, 0));
  assert.equal(currentWeekStart(fri), '2026-11-01');
});
