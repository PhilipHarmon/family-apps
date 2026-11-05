// Mission roles. Every participant gets exactly one, every time — and the
// same role is described differently for each age band, so a five-year-old's
// job is a real job at five-year-old scale, not a smaller copy of a chore.
// tasks: { grownup, big, mid, little }

export const ROLES = [
  {
    id: 'navigator',
    title: 'Navigator',
    emoji: '🧭',
    tasks: {
      grownup: 'Keeps the route safe: watches for traffic, driveways and wiggly crossings, and calls the turns.',
      big: 'Reads the mission steps out loud and leads the way — the crew follows your directions.',
      mid: 'Holds the plan and points which way to go at every corner.',
      little: 'Carries the compass (or a pretend one) and points the way with a very serious face.',
    },
  },
  {
    id: 'clue-keeper',
    title: 'Clue Keeper',
    emoji: '🔍',
    tasks: {
      grownup: "Keeps the checklist honest — reads items aloud and settles all 'does that count?' debates.",
      big: "You're in charge of the scavenger list: read each item, and only YOU can declare it officially found.",
      mid: 'Reads the hunt items out loud and announces each find like a game-show host.',
      little: "Holds the checklist and makes the official check-mark noise: 'CHECK!'",
    },
  },
  {
    id: 'chief-spotter',
    title: 'Chief Spotter',
    emoji: '👀',
    tasks: {
      grownup: 'Scans ahead for the tricky finds and quietly aims the little spotters in the right direction.',
      big: 'First eyes on everything: you scan high, low, near and far for hunt items before anyone else.',
      mid: "Your eyes are the crew's superpower — spot it first and shout 'SPOTTED!'",
      little: 'Look for anything round, red, or wiggly — and shout when you see one!',
    },
  },
  {
    id: 'photo-ranger',
    title: 'Photo Ranger',
    emoji: '📸',
    tasks: {
      grownup: 'Takes the official expedition photos — especially the ridiculous ones.',
      big: 'You are the expedition photographer: document every find, plus one heroic group pose.',
      mid: 'Snap (or pretend-snap) every find so the mission is proven forever.',
      little: "Strike the pose! You're in charge of making everyone say 'adventure!' for photos.",
    },
  },
  {
    id: 'snack-captain',
    title: 'Snack Captain',
    emoji: '🍎',
    tasks: {
      grownup: "Carries the snacks and water, and declares official snack o'clock.",
      big: 'You guard the snack supply and decide when the crew has earned a refuel stop.',
      mid: 'You are in charge of snack morale: nobody adventures on an empty stomach.',
      little: 'You carry one very important snack item and hand out bites like a royal guard.',
    },
  },
  {
    id: 'safety-scout',
    title: 'Safety Scout',
    emoji: '🦺',
    tasks: {
      grownup: 'The buck stops with you: streets, strangers, sunscreen, and knowing when to call it.',
      big: "Watch the crew's backs: count heads at every stop and speak up about anything sketchy.",
      mid: 'Head-counter! Count everyone at every stop — out loud, every time.',
      little: 'Hold a grown-up’s hand at streets, and ROAR if anyone runs ahead.',
    },
  },
  {
    id: 'field-recorder',
    title: 'Field Recorder',
    emoji: '📓',
    tasks: {
      grownup: 'Keeps the expedition journal: tallies, notes, and the funny quotes for later.',
      big: 'You write (or dictate) the official field notes: what we found, where, and what it means.',
      mid: 'You keep the tallies — every bird, bug and weird rock gets counted by you.',
      little: 'You collect one treasure for the expedition collection (a leaf, a pebble — nothing alive!).',
    },
  },
  {
    id: 'weather-watcher',
    title: 'Weather Watcher',
    emoji: '🌤️',
    tasks: {
      grownup: 'Reads the sky and makes the call on layers, shade and turnaround time.',
      big: 'You monitor clouds, wind and temperature like a tiny meteorologist, and report changes.',
      mid: 'Cloud reporter! Announce what the clouds look like every ten minutes.',
      little: 'Feel the wind! Tell everyone: is it a hair-blowing day or a calm day?',
    },
  },
  {
    id: 'sound-scout',
    title: 'Sound Scout',
    emoji: '👂',
    tasks: {
      grownup: 'Leads the listening stops — phones away, ears on, name every sound.',
      big: 'You call the listening stops: freeze the crew and identify every sound you can hear.',
      mid: 'Sound detective: close your eyes and count how many different sounds you can find.',
      little: 'Shhh patrol! You get everyone to freeze and listen — then report the funniest sound you heard.',
    },
  },
  {
    id: 'time-keeper',
    title: 'Time Keeper',
    emoji: '⏰',
    tasks: {
      grownup: "Watches the clock so the mission ends before hangry o'clock.",
      big: 'You announce time checks and call the halfway point like a sports commentator.',
      mid: "You tell everyone when it's time to move to the next step.",
      little: "You shout 'WHAT TIME IS IT?' whenever you want, and a grown-up must answer in a silly voice.",
    },
  },
  {
    id: 'morale-officer',
    title: 'Morale Officer',
    emoji: '📣',
    tasks: {
      grownup: 'Keeps spirits high and invents the expedition chant (quality not guaranteed).',
      big: 'You lead the chant and hand out official high-fives at every find.',
      mid: 'Chief high-fiver! Every find earns a high-five from you.',
      little: 'You lead the happy dance whenever the crew finds something.',
    },
  },
  {
    id: 'gear-captain',
    title: 'Gear Captain',
    emoji: '🎒',
    tasks: {
      grownup: 'Carries the bag of wonders: water, wipes, bandages, and one surprise item.',
      big: 'You carry the expedition kit and hand out tools like a wizard with a backpack.',
      mid: 'Backpack boss: you hold the bag and the very important supplies.',
      little: 'You carry something light and precious — the expedition mascot (a stuffed friend).',
    },
  },
  {
    id: 'storyteller',
    title: 'Storyteller',
    emoji: '📖',
    tasks: {
      grownup: 'Turns the day into a legend at dinner: you keep track of the plot twists.',
      big: 'You narrate the adventure like a nature documentary while it happens.',
      mid: "You make up the story of what the crew finds ('that rock is clearly a dragon egg').",
      little: 'You name things! Every cool rock, bug and tree gets a name from you.',
    },
  },
  {
    id: 'trail-tracker',
    title: 'Trail Tracker',
    emoji: '🐾',
    tasks: {
      grownup: 'Reads the ground with the crew — tracks, trails, and signs of who passed by.',
      big: 'You hunt for signs: tracks, feathers, webs and trails, and report what made them.',
      mid: 'Track hunter: find footprints and guess who (or what) left them.',
      little: "You follow the leader's footsteps exactly — tip-toe, tip-toe — like a tiny spy.",
    },
  },
];
