const mongoose = require('mongoose');

// Recipe — EXTENDED in the Family Hub v20 stage (2026-11-03).
// IMPORTANT: this model predates v20 — it is the Dinner Menu app's
// recipe library (name/time/ingredients/steps/tip/favorite/notes),
// and the Dinner Menu app depends on those exact fields. v20 does
// NOT replace it: it adds the Hub cookbook fields alongside, and
// routes/menu.js keeps the two vocabularies in sync:
//   title        <-> name (same value; `title` is the Hub name for it)
//   instructions <-> steps joined/split on newlines
// New Hub fields are all optional so every legacy Dinner Menu
// document stays valid untouched. `difficulty` is a small enum:
// 'Easy' | 'Medium' | 'Hard' ('' / absent = unset) — chosen over
// free text so the Hub can badge/filter consistently.
const RECIPE_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const Recipe = mongoose.model(
  'Recipe',
  new mongoose.Schema(
    {
      name: { type: String, required: true },
      time: { type: String },
      ingredients: { type: [String], default: [] },
      steps: { type: [String], default: [] },
      tip: { type: String, default: '' },
      favorite: { type: Boolean, default: false },
      notes: { type: String, default: '' },
      // --- v20 Hub cookbook fields (all optional) ---
      sourceUrl: { type: String, default: '' },
      sourceName: { type: String, default: '' },
      prepMinutes: { type: Number },
      cookMinutes: { type: Number },
      difficulty: { type: String, enum: [...RECIPE_DIFFICULTIES, ''], default: '' },
      description: { type: String, default: '' },
      instructions: { type: String, default: '' },
      imageUrl: { type: String, default: '' },
    },
    { timestamps: true },
  ),
);

const Week = mongoose.model(
  'Week',
  new mongoose.Schema({
    days: {
      type: Object,
      default: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
    },
  }),
);

const TrackSchema = new mongoose.Schema(
  { title: String, artist: String, spotifyId: String, spotifyUrl: String },
  { _id: false },
);

const Tape = mongoose.model(
  'Tape',
  new mongoose.Schema({
    title: { type: String, required: true },
    sideA: { type: [TrackSchema], default: [] },
    sideB: { type: [TrackSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  }),
);

const Question = mongoose.model(
  'Question',
  new mongoose.Schema({
    text: { type: String, required: true },
    answer: { type: String, required: true },
    tier: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    topic: { type: String },
  }),
);

const Game = mongoose.model(
  'Game',
  new mongoose.Schema({
    date: { type: String },
    players: { type: [{ name: String, score: Number }], default: [] },
    rounds: { type: Number },
    winner: { type: String },
  }),
);

// A TV share room: the host's phone pushes game state here, the TV's browser
// polls it (no auth — the TV has no keyboard for a family key). Rooms
// auto-expire via the TTL index so abandoned rooms clean themselves up.
const tvRoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  game: { type: String, default: 'trivia' },
  status: { type: String, enum: ['waiting', 'live', 'done'], default: 'waiting' },
  title: String,
  question: String,
  answer: String,
  revealed: { type: Boolean, default: false },
  tierLabel: String,
  points: Number,
  qIndex: Number,
  qTotal: Number,
  players: [String],
  scores: [{ name: String, score: Number, _id: false }],
  winners: [String],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 12 * 3600 * 1000) },
});
tvRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const TvRoom = mongoose.model('TvRoom', tvRoomSchema);

const Photo = mongoose.model(
  'Photo',
  new mongoose.Schema({
    date: { type: String }, // 'YYYY-MM-DD'
    imageUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    // 'image' | 'video'. Older docs without this field read as images.
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  }),
);

const Movie = mongoose.model(
  'Movie',
  new mongoose.Schema({
    title: { type: String, required: true },
    suggestedBy: { type: String },
    kidFriendly: { type: Boolean, default: false },
    note: { type: String, default: '' },
    watched: { type: Boolean, default: false },
    rating: { type: Number },
    favorite: { type: Boolean, default: false },
  }),
);

// A Song Book song: starts life as an 'idea' (kids' input + style), becomes
// 'composed' once Fred fills in lyrics, chords, tabs, score, MIDI and prompts.
const songLyricsSectionSchema = new mongoose.Schema(
  { label: { type: String, default: '' }, lines: { type: [String], default: [] } },
  { _id: false },
);
const songChordSchema = new mongoose.Schema(
  { section: { type: String, default: '' }, progression: { type: String, default: '' } },
  { _id: false },
);
const songRecordingSchema = new mongoose.Schema(
  { date: { type: String, default: '' }, url: { type: String, default: '' } },
  { _id: false },
);
const Song = mongoose.model(
  'Song',
  new mongoose.Schema(
    {
      title: { type: String, required: true },
      idea: { type: String, default: '' },
      style: { type: String, default: '' },
      tempo: { type: Number },
      status: { type: String, enum: ['idea', 'composed'], default: 'idea' },
      lyricsSections: { type: [songLyricsSectionSchema], default: [] },
      chords: { type: [songChordSchema], default: [] },
      guitarTab: { type: String, default: '' },
      bassTab: { type: String, default: '' },
      pianoScore: { type: String, default: '' },
      midiData: { type: String, default: '' }, // base64 of the .mid file
      sunoPrompt: { type: String, default: '' },
      recordings: { type: [songRecordingSchema], default: [] },
    },
    { timestamps: true },
  ),
);


const PassageSchema = new mongoose.Schema(
  {
    teller: { type: String, required: true },
    text: { type: String, default: '' },
    round: { type: Number, default: 1 },
    audioUrl: { type: String, default: '' }, // base64 data URL from the in-app voice-note recorder
  },
  { _id: false }
);

const Story = mongoose.model(
  'Story',
  new mongoose.Schema(
    {
      title: { type: String, required: true },
      tellers: { type: [String], default: [] },
      passages: { type: [PassageSchema], default: [] },
    },
    { timestamps: true }
  )
);

// Sample story, also mirrored in the story-book frontend demo data.
const SEED_STORY = {
  "passages": [
    {
      "audioUrl": "",
      "round": 1,
      "teller": "Philip",
      "text": "In a cave behind the biggest hill in Raleigh lived a dragon named Cinder. Cinder had a terrible problem. Every time he tried to roar, out came... a squeak."
    },
    {
      "audioUrl": "",
      "round": 1,
      "teller": "Wyatt",
      "text": "Cinder decided to march to the top of the hill like a soldier and practice. \u201cHUT, HUT!\u201d he stomped, left-right-left-right. But his roar still came out \u201ceep!\u201d"
    },
    {
      "audioUrl": "",
      "round": 1,
      "teller": "Pepper",
      "text": "Then a brave knight named Pepper rode up on her bicycle. \u201cMaybe your roar is just shy,\u201d she said. \u201cHave you tried gargling with lemonade?\u201d"
    },
    {
      "audioUrl": "",
      "round": 1,
      "teller": "Briar",
      "text": "Cinder gargled the lemonade, took the BIGGEST breath ever, and let out the mightiest ROARRRR! It was so loud the stars giggled. And Cinder never squeaked again. The end!"
    }
  ],
  "tellers": [
    "Philip",
    "Wyatt",
    "Pepper",
    "Briar"
  ],
  "title": "The Dragon Who Lost His Roar"
};

// Adventure Builder shared state — added 2026-11-04 when Adventure
// Builder joined the family-apps suite. ONE document holds the whole
// family's adventure state, mirroring how the Week model holds the
// single shared dinner week (routes/menu.js): the people list built
// in the app, who was picked last time, each person's last role (so
// roles rotate), the cards recently shown (so rerolls don't repeat),
// the mission currently in progress, and the adventure log.
// The generated content (briefings, roles, hunt lists) is stored
// verbatim as plain objects — the generator lives in the client;
// this API only keeps the family's state in sync across devices.
const Adventure = mongoose.model(
  'Adventure',
  new mongoose.Schema(
    {
      customPeople: { type: [Object], default: [] },
      selectedIds: {
        type: [String],
        default: ['philip', 'jessica', 'wyatt', 'pepper', 'briar'],
      },
      lastRoles: { type: Object, default: {} },
      recent: { type: Object, default: { A: [], B: [], C: [] } },
      // The active mission: { briefing, checked: [item texts], startedAt }.
      activeMission: { type: Object, default: null },
      log: { type: [Object], default: [] },
    },
    { timestamps: true },
  ),
);

module.exports = { Recipe, Week, Tape, Question, Game, Photo, Movie, TvRoom, Song, Story, Adventure, SEED_STORY, RECIPE_DIFFICULTIES };
