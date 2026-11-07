// Mission Storybook — the page assembler.
//
// Turns a completed mission into a fixed page structure for the reader:
//
//   page = { type: 'cover'|'call'|'quest'|'completion'|'photos',
//            illustration: '<scene key>', title?: string,
//            lines: [sentences], items?: [...], photos?: [media refs] }
//
// Pure functions only — no storage, no browser APIs — same testable
// pattern as lib/generate.js. This module is the UI bundle's stand-in
// for the canonical assembler shipped with the storybook-api bundle:
// same exports, same contract, so the two compose by replacement.
//
// Input ("mission") is the completion payload the app already has:
//   { briefing, checked: [item texts], startedAt, completedAt, logEntry? }
// where briefing is buildBriefing()'s output and `checked` holds the
// hunt-item texts the crew actually found. Unfound items are NEVER
// mentioned anywhere in the book.

export const SCENE_KEYS = [
  'cover',
  'call',
  'park',
  'woods',
  'neighborhood',
  'museum',
  'backyard',
  'completion',
];

const SETTING_SCENES = {
  nature: 'woods',
  neighborhood: 'neighborhood',
  downtown: 'museum',
  home: 'backyard',
};

const SETTING_WORDS = {
  nature: 'the great outdoors',
  neighborhood: 'the neighborhood',
  downtown: 'downtown',
  home: 'the backyard',
};

// Which quest illustration a mission gets: a museum or park place wins
// over the broad setting; otherwise the setting maps to its home scene.
export function sceneForMission(briefing) {
  const place = `${briefing?.placeName || ''} ${briefing?.placeArea || ''}`;
  if (/museum/i.test(place)) return 'museum';
  if (/botanical|garden/i.test(place)) return 'park';
  if (/park/i.test(place)) return 'park';
  if (/greenway|trail|forest|woods|lake|river/i.test(place)) return 'woods';
  return SETTING_SCENES[briefing?.setting] || 'park';
}

function splitSentences(text) {
  if (!text) return [];
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function longDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function dayPart(iso) {
  const h = iso ? new Date(iso).getHours() : 15;
  if (h < 11) return 'in the bright morning light';
  if (h < 16) return 'under the afternoon sun';
  if (h < 19) return 'as the day turned gold';
  return 'under the evening sky';
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Assemble just the pages (the contract surface).
export function assemblePages(mission, photos = []) {
  const { briefing, checked = [], completedAt } = mission || {};
  if (!briefing) return [];
  const roles = briefing.roles || [];
  const found = [...checked];
  const scene = sceneForMission(briefing);
  const pages = [];

  // Page 1 — Cover.
  const placeLine = briefing.placeName
    ? `At ${briefing.placeName}, ${dayPart(completedAt)}.`
    : `A great adventure in ${SETTING_WORDS[briefing.setting] || 'the wide world'}.`;
  pages.push({
    type: 'cover',
    illustration: 'cover',
    title: briefing.title,
    lines: [
      placeLine,
      longDate(completedAt),
      roles.length
        ? `Starring ${roles.map((r) => `${r.name} the ${r.roleTitle}`).join(', ')}.`
        : 'Starring the bravest crew in the neighborhood.',
    ],
  });

  // Page 2 — The call to adventure, from the briefing's own intro.
  const introLines = splitSentences(briefing.intro).slice(0, 3);
  while (introLines.length < 2) {
    introLines.push(
      introLines.length === 0
        ? 'One morning, a very important mission arrived for the crew.'
        : 'They packed their bags, checked the map twice, and set off.',
    );
  }
  pages.push({
    type: 'call',
    illustration: 'call',
    title: 'The Call to Adventure',
    lines: introLines,
  });

  // Pages 3–5 — The quest: found items only, grouped into story beats,
  // each beat led by a different hero so everyone gets a moment.
  if (found.length === 0) {
    pages.push({
      type: 'quest',
      illustration: scene,
      title: 'The Quest',
      lines: [
        'The crew searched high and low, around every corner and under every leaf.',
        'Some treasures stayed hidden that day — but explorers never really come home empty-handed.',
      ],
      items: [],
    });
  } else {
    const groups = chunk(found, Math.ceil(found.length / Math.min(3, Math.ceil(found.length / 4))));
    groups.slice(0, 3).forEach((items, i) => {
      const hero = roles.length ? roles[i % roles.length] : null;
      const lead = hero
        ? `${hero.name} the ${hero.roleTitle} ${hero.emoji || '🧭'} led this part of the quest.`
        : 'Onward the crew marched.';
      const lines = [
        lead,
        items.length === 1
          ? 'And there it was, waiting to be found:'
          : `They found ${items.length} treasures on this leg of the journey:`,
      ];
      if (i === groups.length - 1) lines.push('Every last treasure on the list — found!');
      pages.push({
        type: 'quest',
        illustration: scene,
        title: i === 0 ? 'The Quest Begins' : i === groups.length - 1 ? 'The Final Treasures' : 'The Quest Goes On',
        lines,
        items,
      });
    });
  }

  // Page 6 — The completion moment.
  pages.push({
    type: 'completion',
    illustration: 'completion',
    title: 'Mission Complete!',
    lines: [
      found.length
        ? `At last, the final treasure was checked off — ${found.length} in all!`
        : 'At last, the crew declared the mission complete.',
      `The flag flew high ${dayPart(completedAt)}, and everyone cheered.`,
      'Another adventure for the storybook shelf. The End.',
    ],
  });

  // Last page — Field Photos (only when the family attached some).
  if (photos && photos.length) {
    pages.push({
      type: 'photos',
      illustration: scene,
      title: 'Field Photos',
      lines: ['Real photos from the day itself — the official evidence, straight from the crew.'],
      photos: [...photos],
    });
  }

  return pages;
}

// Assemble the whole book object (what gets POSTed to /storybooks and
// what the reader renders).
export function assembleBook(mission, photos = []) {
  const { briefing, completedAt } = mission || {};
  return {
    title: briefing?.title || 'A Family Adventure',
    place: briefing?.placeName || null,
    date: completedAt || new Date().toISOString(),
    setting: briefing?.setting || null,
    crew: (briefing?.roles || []).map((r) => ({ name: r.name, roleTitle: r.roleTitle })),
    pages: assemblePages(mission, photos),
  };
}

// ---------- reader navigation (pure, so the page-turner is testable) ----------

export function clampPageIndex(index, pageCount) {
  if (!pageCount || pageCount < 1) return 0;
  const n = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.min(Math.max(n, 0), pageCount - 1);
}

// direction: +1 for next page, -1 for previous. Never runs off either end.
export function turnPage(index, direction, pageCount) {
  return clampPageIndex(index + (direction >= 0 ? 1 : -1), pageCount);
}

export function isFirstPage(index) {
  return index <= 0;
}

export function isLastPage(index, pageCount) {
  return index >= pageCount - 1;
}
