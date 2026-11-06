// Week date helpers for the dated-Week model (Dinner System Phase 1).
// A "week" is identified by its Sunday as a 'YYYY-MM-DD' string.
// All arithmetic is done in UTC on date-only values — deterministic,
// no timezone drift inside a day. (Known edge, documented in the
// Phase 1 build sheet: "the current week" flips at UTC midnight, so
// for a few late-night US hours at a week boundary the /week alias
// can point at the incoming week. Fred always posts sets with an
// explicit weekStart; only the alias is affected.)

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDate(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// Parse a strict 'YYYY-MM-DD' into a UTC Date, or null when malformed
// or not a real calendar date (e.g. 2026-02-30).
function parseDate(str) {
  if (typeof str !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (
    d.getUTCFullYear() !== Number(m[1]) ||
    d.getUTCMonth() !== Number(m[2]) - 1 ||
    d.getUTCDate() !== Number(m[3])
  ) {
    return null;
  }
  return d;
}

function isValidDateString(str) {
  return parseDate(str) !== null;
}

// True when str is a real date AND a Sunday.
function isValidWeekStart(str) {
  const d = parseDate(str);
  return d !== null && d.getUTCDay() === 0;
}

// The Sunday ('YYYY-MM-DD') of the week containing the given date
// (a Date, or a 'YYYY-MM-DD' string). Weeks run Sun–Sat.
function sundayOfWeek(input) {
  const d = typeof input === 'string' ? parseDate(input) : input;
  if (!d || Number.isNaN(d.getTime())) return null;
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  out.setUTCDate(out.getUTCDate() - out.getUTCDay());
  return formatDate(out);
}

function currentWeekStart(now = new Date()) {
  return sundayOfWeek(now);
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return formatDate(d);
}

// The calendar date ('YYYY-MM-DD') of `day` within the week that
// starts at weekStart.
function dateOfDay(weekStart, day) {
  const idx = DAY_KEYS.indexOf(day);
  if (idx === -1) return null;
  return addDays(weekStart, idx);
}

// 'YYYY-MM-DD' for today (UTC).
function todayString(now = new Date()) {
  return formatDate(now);
}

module.exports = {
  DAY_KEYS,
  parseDate,
  formatDate,
  isValidDateString,
  isValidWeekStart,
  sundayOfWeek,
  currentWeekStart,
  addDays,
  dateOfDay,
  todayString,
};
