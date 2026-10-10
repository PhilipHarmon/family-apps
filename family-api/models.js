const mongoose = require('mongoose');

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

module.exports = { Recipe, Week, Tape, Question, Game, Photo, Movie, TvRoom };
