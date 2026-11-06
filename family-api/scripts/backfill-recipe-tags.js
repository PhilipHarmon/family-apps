// One-time tag backfill for Dinner System Phase 1 (spec §3.3):
// propose Recipe.tags from name/time/ingredient/step signals
// (see ../tagRules.js for the rules and their confidence levels).
//
// DRY RUN BY DEFAULT — prints every proposal and writes nothing.
//   node scripts/backfill-recipe-tags.js            # dry run
//   node scripts/backfill-recipe-tags.js --apply    # write HIGH-confidence tags only
//   node scripts/backfill-recipe-tags.js --apply --include-medium
//
// Conservative by design: with --apply, only high-confidence tags are
// written, and only tags a recipe doesn't already carry are added —
// re-running never removes or overwrites tags the family set by hand.
// Reads MONGO_URI from family-api/.env, like the server.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Recipe } = require('../models');
const { proposeTags } = require('../tagRules');

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const includeMedium = args.includes('--include-medium');
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set (family-api/.env). Aborting.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const recipes = await Recipe.find().sort({ name: 1 });
    console.log(
      apply
        ? `APPLYING ${includeMedium ? 'high+medium' : 'high'}-confidence tags to ${recipes.length} recipes…`
        : `DRY RUN over ${recipes.length} recipes — nothing will be written.`,
    );
    let proposed = 0;
    let written = 0;
    for (const recipe of recipes) {
      const existing = new Set(recipe.tags || []);
      const fresh = proposeTags(recipe).filter((p) => !existing.has(p.tag));
      if (!fresh.length) continue;
      proposed += 1;
      const applicable = fresh.filter((p) => p.confidence === 'high' || includeMedium);
      const desc = fresh
        .map((p) => {
          const held = p.confidence !== 'high' && !includeMedium;
          return `${p.tag} (${p.confidence}: ${p.signal})${held ? ' [held — medium, not applied]' : ''}`;
        })
        .join(', ');
      console.log(`  ${recipe.name}: ${desc}`);
      if (apply && applicable.length) {
        recipe.tags = [...existing, ...applicable.map((p) => p.tag)];
        await recipe.save();
        written += 1;
      }
    }
    console.log(
      `Recipes with new tag proposals: ${proposed}.` +
        (apply ? ` Written: ${written}.` : ' Re-run with --apply to write the high-confidence ones.'),
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
