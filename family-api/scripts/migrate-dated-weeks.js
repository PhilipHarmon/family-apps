// One-time migration for Dinner System Phase 1 (spec §3.1): stamp the
// single legacy UNDATED Week document with a weekStart so it becomes
// the dated doc for its week.
//
// The undated doc is "the current plan", so it is stamped with the
// Sunday of the week in which the migration runs — the only honest
// reading of an undated doc. Pass --week-start=YYYY-MM-DD (a Sunday)
// to override. Safe to re-run: once no undated doc remains, it is a
// no-op (idempotent).
//
// Usage (from the family-api directory):
//   node scripts/migrate-dated-weeks.js [--dry-run] [--week-start=2026-11-08]
//
// Reads MONGO_URI from family-api/.env, like the server.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Week } = require('../models');
const { currentWeekStart, isValidWeekStart } = require('../weeks');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const wsArg = args.find((a) => a.startsWith('--week-start='));
  const weekStart = wsArg ? wsArg.slice('--week-start='.length) : currentWeekStart();
  if (!isValidWeekStart(weekStart)) {
    console.error(`"${weekStart}" is not a Sunday (YYYY-MM-DD). Aborting.`);
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set (family-api/.env). Aborting.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const undated = await Week.find({
      $or: [{ weekStart: { $exists: false } }, { weekStart: null }],
    }).sort({ _id: 1 });
    if (undated.length === 0) {
      console.log('Nothing to migrate: every Week document already has a weekStart.');
      return;
    }
    const target = undated[0];
    const clash = await Week.findOne({ weekStart, _id: { $ne: target._id } });
    if (clash) {
      console.error(
        `A dated Week for ${weekStart} already exists (${clash._id}) alongside the undated doc (${target._id}). ` +
          'Refusing to guess which is the real plan — resolve by hand.',
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `${dryRun ? '[dry run] Would stamp' : 'Stamping'} the undated Week (${target._id}) with weekStart ${weekStart}.`,
    );
    if (undated.length > 1) {
      console.warn(
        `WARNING: ${undated.length} undated Week documents exist (expected exactly one). ` +
          `Only the oldest was stamped; these remain undated: ${undated.slice(1).map((w) => w._id).join(', ')}`,
      );
    }
    if (!dryRun) {
      target.weekStart = weekStart;
      if (!target.createdAt) target.createdAt = new Date();
      await target.save();
      await Week.init(); // make sure the unique weekStart index exists
      console.log('Done. The live plan is now the dated week of', weekStart);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
