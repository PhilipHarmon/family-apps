const express = require('express');
const { Tape, Photo, Movie } = require('../models');

const router = express.Router();

// --- Tapes (mixtapes) ---
router.get('/tapes', async (_req, res, next) => {
  try {
    res.json(await Tape.find().sort({ createdAt: -1, _id: -1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/tapes', async (req, res, next) => {
  try {
    const { title, sideA, sideB } = req.body || {};
    const tape = await Tape.create({ title, sideA, sideB });
    res.status(201).json(tape);
  } catch (err) {
    next(err);
  }
});

router.get('/tapes/:id', async (req, res, next) => {
  try {
    const tape = await Tape.findById(req.params.id);
    if (!tape) return res.status(404).json({ error: 'Tape not found' });
    res.json(tape);
  } catch (err) {
    next(err);
  }
});

router.delete('/tapes/:id', async (req, res, next) => {
  try {
    const tape = await Tape.findByIdAndDelete(req.params.id);
    if (!tape) return res.status(404).json({ error: 'Tape not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// --- Photos (photo-a-day journal) ---
router.get('/photos', async (_req, res, next) => {
  try {
    res.json(await Photo.find().sort({ date: -1, _id: -1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/photos', async (req, res, next) => {
  try {
    const { date, imageUrl, caption } = req.body || {};
    const photo = await Photo.create({ date, imageUrl, caption });
    res.status(201).json(photo);
  } catch (err) {
    next(err);
  }
});

router.put('/photos/:id', async (req, res, next) => {
  try {
    const { date, imageUrl, caption } = req.body || {};
    const photo = await Photo.findByIdAndUpdate(
      req.params.id,
      { date, imageUrl, caption },
      { new: true },
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    res.json(photo);
  } catch (err) {
    next(err);
  }
});

router.delete('/photos/:id', async (req, res, next) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// --- Movies (movie night picker) ---
router.get('/movies', async (_req, res, next) => {
  try {
    res.json(await Movie.find().sort({ _id: -1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/movies', async (req, res, next) => {
  try {
    const { title, suggestedBy, kidFriendly, note, watched, rating, favorite } = req.body || {};
    const movie = await Movie.create({ title, suggestedBy, kidFriendly, note, watched, rating, favorite });
    res.status(201).json(movie);
  } catch (err) {
    next(err);
  }
});

router.put('/movies/:id', async (req, res, next) => {
  try {
    const { title, suggestedBy, kidFriendly, note, watched, rating, favorite } = req.body || {};
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { title, suggestedBy, kidFriendly, note, watched, rating, favorite },
      { new: true },
    );
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    next(err);
  }
});

router.delete('/movies/:id', async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
