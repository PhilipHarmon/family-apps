const mongoose = require('mongoose');

// RadioEpisode — one episode of "Harmon Radio" (Saturday Morning
// Family Radio), the family podcast shelf in the Fridge Door.
//
// This is a STANDALONE model file on purpose, in the FirstReaderNote
// style: the Harmon Radio merge must not require editing
// family-api's models.js. Requiring this file registers the model on
// the same shared mongoose instance the rest of family-api uses;
// routes/radio.js is the only consumer.
//
// Episodes are short audio shows (the pilot runs about nine and a
// half minutes), not user content: they are created by Fred when a
// new episode is produced, listed for the Hub player, read back and
// deleted — never edited by the API. `audioUrl` points at the episode
// audio file (today a hosted mp3); the Hub player streams it
// directly, so the list carries full fields including audioUrl and
// description — the shelf is small and the player needs them there.

const RadioEpisode = mongoose.model(
  'RadioEpisode',
  new mongoose.Schema(
    {
      title: { type: String, required: true },
      date: { type: String }, // 'YYYY-MM-DD' — the air date
      audioUrl: { type: String, required: true },
      durationSec: { type: Number, default: 0 },
      description: { type: String, default: '' },
      createdBy: { type: String, default: '' },
    },
    { timestamps: true },
  ),
);

module.exports = { RadioEpisode };
