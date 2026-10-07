/* Demo-mode API backend for the dinner-menu app.
 *
 * When ?demo=1 is in the URL, every API call is intercepted and served from
 * warm sample data persisted in localStorage under 'demoData:dinner-menu'.
 * Demo mode NEVER touches the real family server and NEVER requires a
 * family key.
 */

const STORE_KEY = 'demoData:dinner-menu';

function newId() {
  return 'demo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

const SEED = [
  {
    name: 'Spaghetti & Meatballs',
    time: '45 min',
    ingredients: [
      '1 lb spaghetti',
      '1 lb ground beef',
      '1/2 cup breadcrumbs',
      '1/4 cup grated Parmesan, plus more for serving',
      '1 large egg',
      '2 cloves garlic, minced',
      '1 tsp Italian seasoning',
      '1 tsp kosher salt',
      '1/2 tsp black pepper',
      '1 (24 oz) jar marinara sauce',
      '2 tbsp olive oil',
      'Fresh basil leaves (optional)',
    ],
    steps: [
      'In a large bowl, mix the ground beef, breadcrumbs, Parmesan, egg, garlic, Italian seasoning, salt, and pepper until just combined — don’t overwork it.',
      'Roll into 1 1/2-inch meatballs (you’ll get about 18–20).',
      'Heat the olive oil in a large skillet over medium-high heat and brown the meatballs on all sides, about 8 minutes total.',
      'Pour in the marinara sauce, reduce heat to low, and simmer 15 minutes until the meatballs are cooked through.',
      'Meanwhile, cook the spaghetti in well-salted water until al dente; reserve 1/2 cup pasta water, then drain.',
      'Toss the spaghetti with the sauce and meatballs, loosening with pasta water as needed.',
      'Serve with extra Parmesan and basil. Seconds are encouraged.',
    ],
    tip: 'Wyatt asked if meatballs can be made in Lego shapes. Answer: yes, but they still have to be round enough to cook evenly.',
  },
  {
    name: 'Taco Night',
    time: '30 min',
    ingredients: [
      '1 1/2 lbs ground beef or turkey',
      '1 packet taco seasoning',
      '12 flour or corn tortillas',
      '1 cup shredded cheddar cheese',
      '2 cups shredded lettuce',
      '2 Roma tomatoes, diced',
      '1/2 red onion, diced',
      '1 cup sour cream',
      '1 jar salsa',
      '1 avocado, sliced (optional)',
      'Lime wedges',
    ],
    steps: [
      'Brown the ground beef in a large skillet over medium-high heat, breaking it up, about 8 minutes. Drain excess fat.',
      'Stir in the taco seasoning and 1/2 cup water; simmer 5 minutes until thickened.',
      'Warm the tortillas in a dry skillet or wrapped in foil in the oven.',
      'Set out all the toppings buffet-style and let everyone build their own.',
      'Eat with lime squeezed over the top. No judgment on taco count.',
    ],
    tip: 'Pepper’s rule: at least three tacos, extra cheese. Briar’s rule: the tortilla must be warm or the deal is off.',
  },
  {
    name: 'Smash Burgers',
    time: '25 min',
    ingredients: [
      '1 1/2 lbs 80/20 ground beef, divided into 6 loose balls',
      '6 burger buns',
      '6 slices American cheese',
      '1 cup shredded lettuce',
      '1 large tomato, sliced',
      'Dill pickle chips',
      '1/4 cup mayonnaise',
      '2 tbsp ketchup',
      '1 tbsp yellow mustard',
      'Kosher salt and black pepper',
      '2 tbsp butter, softened (for buns)',
    ],
    steps: [
      'Stir the mayo, ketchup, and mustard together — that’s your burger sauce. Refrigerate until serving.',
      'Heat a cast-iron skillet or griddle over high heat until just smoking.',
      'Butter the buns and toast them cut-side down on the griddle; set aside.',
      'Place a beef ball on the hot griddle and smash flat with a heavy spatula. Season generously with salt and pepper.',
      'Cook 2 minutes, flip, immediately top with cheese, and cook 1 more minute.',
      'Stack onto buns with sauce, lettuce, tomato, and pickles. Serve immediately — smash burgers wait for no one.',
    ],
    tip: 'Best eaten on the porch with Jimmy Buffett on the speaker. Extra pickles for Jessica.',
  },
  {
    name: 'Sheet-Pan Chicken & Veggies',
    time: '40 min',
    ingredients: [
      '1 1/2 lbs boneless, skinless chicken breasts or thighs',
      '1 lb baby potatoes, halved',
      '2 cups broccoli florets',
      '1 red bell pepper, sliced',
      '1 red onion, wedged',
      '3 tbsp olive oil',
      '1 tsp garlic powder',
      '1 tsp smoked paprika',
      '1 tsp Italian seasoning',
      '1 tsp kosher salt',
      '1/2 tsp black pepper',
      'Lemon wedges, for serving',
    ],
    steps: [
      'Heat the oven to 425°F. Line a large sheet pan with parchment.',
      'Toss the potatoes with half the oil and half the seasonings; spread on the pan and roast 10 minutes.',
      'Meanwhile, toss the chicken, broccoli, peppers, and onion with the remaining oil and seasonings.',
      'Push the potatoes to one side, add everything else to the pan in a single layer.',
      'Roast 18–22 minutes more, until the chicken reaches 165°F and the veggies are golden.',
      'Squeeze lemon over everything and serve. One pan to wash — Dad’s favorite part.',
    ],
    tip: 'Briar will eat the broccoli if you call them “little trees.” It works every time.',
  },
  {
    name: 'Breakfast-for-Dinner Pancakes',
    time: '30 min',
    ingredients: [
      '2 cups all-purpose flour',
      '2 tbsp sugar',
      '2 tsp baking powder',
      '1/2 tsp baking soda',
      '1/2 tsp salt',
      '2 cups buttermilk',
      '2 large eggs',
      '1/4 cup melted butter, plus more for the griddle',
      '1 tsp vanilla extract',
      'Maple syrup, for serving',
      '1 lb breakfast sausage or a pack of bacon',
      'Fresh berries (optional)',
    ],
    steps: [
      'Whisk the flour, sugar, baking powder, baking soda, and salt in a big bowl.',
      'In a second bowl, whisk the buttermilk, eggs, melted butter, and vanilla.',
      'Pour wet into dry and stir until just combined — lumps are fine.',
      'Cook the sausage or bacon in a skillet first; keep warm and save the griddle for pancakes.',
      'Ladle 1/4-cup scoops of batter onto a buttered griddle over medium heat. Flip when bubbles pop on the surface, about 2 minutes per side.',
      'Stack them high, pour on the syrup, and declare dinner a success.',
    ],
    tip: 'Pepper flips better than anyone in the house — she learned watching Saturday morning cartoons, apparently. Let her take the last batch.',
  },
  {
    name: 'Slow-Cooker Pulled Pork',
    time: '8 hrs (mostly hands-off)',
    ingredients: [
      '4–5 lb pork shoulder (Boston butt)',
      '2 tbsp brown sugar',
      '1 tbsp smoked paprika',
      '2 tsp kosher salt',
      '1 tsp black pepper',
      '1 tsp garlic powder',
      '1 tsp onion powder',
      '1/2 cup apple cider vinegar',
      '1/2 cup chicken broth',
      '1 cup BBQ sauce, plus more for serving',
      'Sandwich buns',
      'Coleslaw (optional, but recommended)',
    ],
    steps: [
      'Mix the brown sugar, paprika, salt, pepper, garlic powder, and onion powder; rub all over the pork shoulder.',
      'Pour the vinegar and broth into the slow cooker; nestle the pork in.',
      'Cook on LOW 8–10 hours (or HIGH 4–5) until the pork shreds easily with a fork.',
      'Lift the pork out, shred it, and skim the fat from the cooking liquid.',
      'Toss the shredded pork with the BBQ sauce and a splash of the cooking liquid.',
      'Pile onto buns with coleslaw. Leftovers make legendary nachos tomorrow.',
    ],
    tip: 'Start it before work and come home to the best-smelling house in Raleigh. Wyatt calls this “victory pork.”',
  },
];

function seedStore() {
  const recipes = SEED.map((r) => ({
    _id: newId(),
    name: r.name,
    time: r.time,
    ingredients: [...r.ingredients],
    steps: [...r.steps],
    tip: r.tip,
    favorite: false,
    notes: '',
  }));
  /* Showcase the favorites/notes features in the demo. */
  const tacoNight = recipes.find((r) => r.name === 'Taco Night');
  if (tacoNight) tacoNight.favorite = true;
  const spaghetti = recipes.find((r) => r.name === 'Spaghetti & Meatballs');
  if (spaghetti)
    spaghetti.notes =
      'Next time: double the meatballs — Wyatt ate six. Try half pork, half beef for extra flavor.';
  const days = {
    mon: 'Spaghetti & Meatballs',
    tue: 'Taco Night',
    wed: null,
    thu: 'Sheet-Pan Chicken & Veggies',
    fri: 'Smash Burgers',
    sat: null,
    sun: 'Breakfast-for-Dinner Pancakes',
  };
  return { recipes, days };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.recipes) && data.days) return data;
    }
  } catch {
    /* corrupted storage — reseed below */
  }
  const data = seedStore();
  save(data);
  return data;
}

function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    /* storage full/blocked — demo data just lives for the session */
  }
}

/* Deep-clone so callers can't mutate the stored copy. */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const notFound = (thing) => Object.assign(new Error(`${thing} not found`), { status: 404 });

export function handleDemoRequest(method, path, body) {
  /* Strip the query string for routing (no query params used here, but
   * keep the mechanism), and accept both /recipes and /api/recipes. */
  let clean = String(path || '').split('?')[0];
  if (clean.startsWith('/api')) clean = clean.slice(4) || '/';

  const data = load();

  if (method === 'GET' && clean === '/recipes') {
    return clone(data.recipes).sort((a, b) => a.name.localeCompare(b.name));
  }

  if (method === 'POST' && clean === '/recipes') {
    const { name, time, ingredients, steps, tip, favorite, notes } = body || {};
    const recipe = {
      _id: newId(),
      name,
      time,
      ingredients: ingredients || [],
      steps: steps || [],
      tip: tip || '',
      favorite: !!favorite,
      notes: notes || '',
    };
    data.recipes.push(recipe);
    save(data);
    return clone(recipe);
  }

  if (method === 'PUT' && clean.startsWith('/recipes/')) {
    const id = clean.slice('/recipes/'.length);
    const recipe = data.recipes.find((r) => r._id === id);
    if (!recipe) throw notFound('Recipe');
    const allowed = ['name', 'time', 'ingredients', 'steps', 'tip', 'favorite', 'notes'];
    for (const key of allowed) {
      if (body && body[key] !== undefined) recipe[key] = body[key];
    }
    save(data);
    return clone(recipe);
  }

  if (method === 'POST' && clean === '/recipes/seed') {
    if (data.recipes.length > 0) return { seeded: 0 };
    const fresh = seedStore();
    data.recipes = fresh.recipes;
    save(data);
    return { seeded: data.recipes.length };
  }

  if (method === 'GET' && clean === '/week') {
    return { days: clone(data.days) };
  }

  if (method === 'PUT' && clean === '/week') {
    const days = (body && body.days) || {};
    data.days = {
      mon: days.mon ?? null,
      tue: days.tue ?? null,
      wed: days.wed ?? null,
      thu: days.thu ?? null,
      fri: days.fri ?? null,
      sat: days.sat ?? null,
      sun: days.sun ?? null,
    };
    save(data);
    return { days: clone(data.days) };
  }

  throw notFound('Route');
}
