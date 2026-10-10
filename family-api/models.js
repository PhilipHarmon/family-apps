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
  { song: String, artist: String },
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

module.exports = { Recipe, Week, Tape, Question, Game, Photo, Movie };
