// The crew. Pre-seeded with the family; grandparents, cousins and friends
// get added in the app and sync through the family API (family state,
// routes/adventures.js), so they're waiting on every device.

export const BANDS = [
  { id: 'grownup', label: 'Grown-up' },
  { id: 'big', label: 'Big kid (9–12)' },
  { id: 'mid', label: 'Mid kid (6–8)' },
  { id: 'little', label: 'Little kid (3–5)' },
];

export const BAND_EMOJI = {
  grownup: '🧑',
  big: '🧒',
  mid: '👧',
  little: '🐣',
};

export const FAMILY = [
  { id: 'philip', name: 'Philip', band: 'grownup', color: '#7e3517' },
  { id: 'jessica', name: 'Jessica', band: 'grownup', color: '#c25e3a' },
  { id: 'wyatt', name: 'Wyatt', band: 'big', color: '#2e6b4f' },
  { id: 'pepper', name: 'Pepper', band: 'mid', color: '#7a4a8c' },
  { id: 'briar', name: 'Briar', band: 'little', color: '#d18f2a' },
];

// Colors handed out, in order, to people added later.
export const EXTRA_COLORS = ['#33618c', '#8c3333', '#3f7d8c', '#6b8c33', '#8c5a33', '#555f8c', '#a34a6b', '#4a6b8c'];
