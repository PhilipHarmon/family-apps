const mongoose = require('mongoose');

// FirstReaderNote — one note (or finish record) left by an invited
// reader of "Let Sleeping Beagles Lay" in the First Readers app.
//
// This is a STANDALONE model file on purpose: the First Readers merge
// must not require editing family-api's models.js. Requiring this file
// registers the model on the same shared mongoose instance the rest of
// family-api uses; routes/firstReaders.js is the only consumer.
//
// A record with empty worked/snagged/loved and pulse === null is a
// FINISH MARKER: the app files one when a reader taps "I finished this
// chapter" without leaving a written note, so the author dashboard can
// count chapters finished per reader. Written notes carry text and/or
// a 1–5 pulse in the same shape.
//
// Notes are append-only keepsakes of the drafting process: they are
// created and read, never edited or deleted by the API.
const FirstReaderNote = mongoose.model(
  'FirstReaderNote',
  new mongoose.Schema(
    {
      readerName: { type: String, required: true },
      chapterId: { type: String, required: true }, // 'prologue' | 'chapter-1' … 'chapter-10'
      worked: { type: String, default: '' },
      snagged: { type: String, default: '' },
      loved: { type: String, default: '' },
      pulse: { type: Number, min: 1, max: 5, default: null }, // null = no pulse given
    },
    { timestamps: true },
  ),
);

module.exports = { FirstReaderNote };
