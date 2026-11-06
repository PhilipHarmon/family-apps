// Recipe tag proposals for the one-time backfill (Dinner System
// Phase 1, spec §3.3). Pure signal matching over a recipe's name,
// time, ingredients and steps — no external calls.
//
// Every proposal carries a confidence:
//   'high'   — an explicit signal (the recipe's own time field, an
//              appliance/method named in name or steps, a dish-type
//              word in the name). scripts/backfill-recipe-tags.js
//              applies ONLY these with --apply.
//   'medium' — an inference (an ingredient word, a storage hint).
//              Shown in the dry run for Fred to eyeball; never
//              auto-applied.
// Some vocabulary tags get NO rule at all: 'kid-favorite' is a family
// judgment, not a textual signal, and guessing it would be inventing
// data. The family adds it by hand in the Hub recipe form.

function haystacks(recipe) {
  return {
    name: String(recipe.name || ''),
    time: String(recipe.time || ''),
    ingredients: (recipe.ingredients || []).join('\n'),
    steps: (recipe.steps || []).join('\n'),
    all: [
      recipe.name || '',
      recipe.time || '',
      (recipe.ingredients || []).join('\n'),
      (recipe.steps || []).join('\n'),
      recipe.instructions || '',
    ].join('\n'),
  };
}

// Rough total minutes from a free-text time field ('~30 min',
// '4h (crockpot, low)', '1 hr 15 min'). null when unparseable.
function parseTimeMinutes(time) {
  const t = String(time || '').toLowerCase();
  if (!t) return null;
  const hours = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour)/.exec(t);
  const mins = /(\d+)\s*(?:m|min|mins|minute)/.exec(t);
  if (!hours && !mins) return null;
  return (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
}

// Returns [{ tag, confidence, signal }] — deduped by tag (highest
// confidence wins), in rule order.
function proposeTags(recipe) {
  const h = haystacks(recipe);
  const found = new Map();
  const add = (tag, confidence, signal) => {
    const prev = found.get(tag);
    if (!prev || (prev.confidence === 'medium' && confidence === 'high')) {
      found.set(tag, { tag, confidence, signal });
    }
  };

  if (/\b(crockpot|slow[-\s]?cooker)\b/i.test(h.all)) {
    add('crockpot', 'high', 'names a crockpot / slow cooker');
  }
  if (/\bone[-\s]pot\b/i.test(h.all)) {
    add('one-pot', 'high', 'says one-pot');
  }
  if (/\bsheet[-\s]pan\b/i.test(h.all)) {
    add('sheet-pan', 'high', 'says sheet pan');
  }
  if (/\b(soup|stew|chili|chowder|gumbo)\b/i.test(h.name)) {
    add('soup-stew', 'high', 'dish-type word in the name');
  }
  if (/\b(pasta|spaghetti|lasagna|macaroni|fettuccine|alfredo|penne)\b/i.test(h.name)) {
    add('pasta', 'high', 'pasta word in the name');
  } else if (/\b(pasta|spaghetti|noodles?)\b/i.test(h.ingredients)) {
    add('pasta', 'medium', 'pasta/noodles among the ingredients');
  }
  if (/\b(taco|tacos|burrito|burritos|quesadilla|enchilada|fajita|fajitas)\b/i.test(h.name)) {
    add('taco-night', 'high', 'taco-night word in the name');
  }
  if (/\bgrill(ed|ing)?\b/i.test(h.name) || /\bgrill\b/i.test(h.steps)) {
    add('grill', 'high', 'grilling named in name/steps');
  }
  const minutes = parseTimeMinutes(h.time);
  if (minutes !== null && minutes <= 30) {
    add('30-min', 'high', `time field reads ~${minutes} min`);
  }
  if (/\b(vegetarian|veggie)\b/i.test(h.name) || /\bblack bean\b/i.test(h.name)) {
    add('vegetarian', 'medium', 'name hints a meatless main — verify by eye');
  }
  if (/\b(freezer|freeze)\b/i.test(h.steps)) {
    add('freezer-friendly', 'medium', 'steps mention freezing');
  }

  return [...found.values()];
}

module.exports = { proposeTags, parseTimeMinutes };
