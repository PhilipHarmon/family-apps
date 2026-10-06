// Seeded question bank for Family Trivia Night.
// Each question: { question, answer, tier } — tier is one of 'easy' | 'medium' | 'hard'.

export const TIERS = {
  easy:   { id: 'easy',   label: "Briar Easy",            tagline: 'For our littlest brainiac', points: 1 },
  medium: { id: 'medium', label: 'Wyatt & Pepper Medium', tagline: 'For the big-kid crew',      points: 2 },
  hard:   { id: 'hard',   label: 'Grown-Up Hard',         tagline: 'For the old folks',          points: 3 },
};

export const SEED_QUESTIONS = [
  // ---------------- Briar Easy (1 pt): Bluey, colors, animals ----------------
  { tier: 'easy', question: 'What color is Bluey\u2019s fur?', answer: 'Blue! She\u2019s a blue heeler.' },
  { tier: 'easy', question: 'What is Bluey\u2019s little sister called?', answer: 'Bingo' },
  { tier: 'easy', question: 'What is Bluey\u2019s mom\u2019s name?', answer: 'Chilli' },
  { tier: 'easy', question: 'What do you get when you mix blue and yellow?', answer: 'Green' },
  { tier: 'easy', question: 'What color is a ripe strawberry?', answer: 'Red' },
  { tier: 'easy', question: 'What animal says "moo"?', answer: 'A cow' },
  { tier: 'easy', question: 'How many legs does a spider have?', answer: 'Eight' },
  { tier: 'easy', question: 'What do bees make?', answer: 'Honey' },
  { tier: 'easy', question: 'What animal is the fastest runner on land?', answer: 'The cheetah' },
  { tier: 'easy', question: 'What do you call a baby dog?', answer: 'A puppy' },
  { tier: 'easy', question: 'What color is the sun in most drawings?', answer: 'Yellow' },
  { tier: 'easy', question: 'Which animal has a long trunk?', answer: 'The elephant' },

  // ---------------- Wyatt & Pepper Medium (2 pts) ----------------
  { tier: 'medium', question: 'What does the "D" in D-Day stand for?', answer: 'Trick question \u2014 it doesn\u2019t stand for anything! The "D" just means "day."' },
  { tier: 'medium', question: 'In which country did the D-Day landings happen?', answer: 'France (on the beaches of Normandy)' },
  { tier: 'medium', question: 'What planet is known as the Red Planet?', answer: 'Mars' },
  { tier: 'medium', question: 'In "Frozen," what is the snowman\u2019s name?', answer: 'Olaf' },
  { tier: 'medium', question: 'How many dwarfs help Snow White?', answer: 'Seven' },
  { tier: 'medium', question: 'What is the name of Moana\u2019s silly chicken?', answer: 'Heihei' },
  { tier: 'medium', question: 'In "The Lion King," what is Simba\u2019s dad\u2019s name?', answer: 'Mufasa' },
  { tier: 'medium', question: 'What force pulls everything down toward the Earth?', answer: 'Gravity' },
  { tier: 'medium', question: 'Which is the biggest ocean in the world?', answer: 'The Pacific Ocean' },
  { tier: 'medium', question: 'About how many days does it take Earth to orbit the Sun?', answer: '365 days' },
  { tier: 'medium', question: 'In Trolls, what are the grumpy giants who want to eat the Trolls called?', answer: 'Bergens' },
  { tier: 'medium', question: 'What do plants need to make their food? (Name two!)', answer: 'Sunlight, water, and air \u2014 any two counts!' },

  // ---------------- Grown-Up Hard (3 pts) ----------------
  { tier: 'hard', question: 'In "Back to the Future," how fast must the DeLorean go to time travel?', answer: '88 miles per hour' },
  { tier: 'hard', question: 'In "Ghostbusters," what do they warn you should NEVER do?', answer: 'Cross the streams' },
  { tier: 'hard', question: 'What does Inigo Montoya always say before a duel in "The Princess Bride"?', answer: '"Hello. My name is Inigo Montoya. You killed my father. Prepare to die."' },
  { tier: 'hard', question: 'In "Ferris Bueller\u2019s Day Off," what kind of car does Cameron\u2019s dad own?', answer: 'A 1961 Ferrari 250 GT' },
  { tier: 'hard', question: 'Which 1986 Tom Cruise movie made everyone want to be a fighter pilot?', answer: '"Top Gun"' },
  { tier: 'hard', question: 'Which quiet acoustic Led Zeppelin instrumental closes out Philip\u2019s mix tapes?', answer: '"Bron-Yr-Aur" (from Physical Graffiti)' },
  { tier: 'hard', question: 'Which Led Zeppelin album cover shows a man carrying a bundle of sticks?', answer: '"Led Zeppelin IV"' },
  { tier: 'hard', question: 'Jimmy Buffett\u2019s most famous song is about wasting away in which fictional place?', answer: 'Margaritaville' },
  { tier: 'hard', question: 'Phish\u2019s devoted fanbase is most often compared to the followers of which band?', answer: 'The Grateful Dead' },
  { tier: 'hard', question: 'Which Stephen King novel features a killer clown named Pennywise?', answer: '"It"' },
  { tier: 'hard', question: 'In Stephen King\u2019s "The Shining," what word does Danny keep repeating?', answer: '"Redrum"' },
  { tier: 'hard', question: 'David Foster Wallace\u2019s "Infinite Jest" is famous for what structural quirk?', answer: 'Its enormous endnotes \u2014 nearly 100 pages of footnotes!' },
];
