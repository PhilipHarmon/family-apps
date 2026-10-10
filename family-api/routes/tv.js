// TV share rooms for the family apps (Trivia Night pilot).
//
// The host's phone creates a room and pushes game state into it; the TV's
// browser polls GET /tv/rooms/:code with no auth (a TV remote is no place
// for a family key). POST/PUT/DELETE require the family key inline.
// Rooms expire 12 hours after creation via the TTL index on TvRoom.
const express = require('express');
const requireKey = require('../middleware/requireKey');
const { TvRoom } = require('../models');

const router = express.Router();

// Unambiguous characters only — nothing that looks like something else
// when shouted across the living room.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function normCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

function cleanPlayers(players) {
  if (!Array.isArray(players)) return [];
  return players
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim().slice(0, 24))
    .filter(Boolean)
    .slice(0, 12);
}

// POST /tv/rooms — the host opens a share room. Returns { code }.
router.post('/tv/rooms', requireKey, async (req, res, next) => {
  try {
    const body = req.body || {};
    const game = ['trivia', 'movie'].includes(body.game) ? body.game : 'trivia';
    const title = String(body.title || '').slice(0, 80);
    const players = cleanPlayers(body.players);

    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = makeCode();
      const exists = await TvRoom.findOne({ code: candidate }).lean();
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return res.status(500).json({ error: 'Could not make a room — try again.' });
    }

    await TvRoom.create({ code, game, title, players, status: 'waiting' });
    res.status(201).json({ code });
  } catch (err) {
    next(err);
  }
});

// PUT /tv/rooms/:code — the host pushes game state. Whitelisted fields only.
router.put('/tv/rooms/:code', requireKey, async (req, res, next) => {
  try {
    const code = normCode(req.params.code);
    const body = req.body || {};
    const update = {};

    if (body.status !== undefined) {
      if (!['waiting', 'live', 'done'].includes(body.status)) {
        return res.status(400).json({ error: 'Bad status.' });
      }
      update.status = body.status;
    }
    if (body.title !== undefined) update.title = String(body.title).slice(0, 80);
    if (body.question !== undefined) update.question = String(body.question).slice(0, 500);
    if (body.answer !== undefined) update.answer = String(body.answer).slice(0, 300);
    if (body.revealed !== undefined) update.revealed = Boolean(body.revealed);
    if (body.tierLabel !== undefined) update.tierLabel = String(body.tierLabel).slice(0, 40);
    if (body.points !== undefined) update.points = Number(body.points) || 0;
    if (body.qIndex !== undefined) update.qIndex = Number(body.qIndex) || 0;
    if (body.qTotal !== undefined) update.qTotal = Number(body.qTotal) || 0;
    if (body.players !== undefined) update.players = cleanPlayers(body.players);
    if (body.scores !== undefined) {
      update.scores = Array.isArray(body.scores)
        ? body.scores
            .filter((s) => s && typeof s === 'object')
            .map((s) => ({
              name: String(s.name || '').slice(0, 24),
              score: Number(s.score) || 0,
            }))
            .slice(0, 12)
        : [];
    }
    if (body.winners !== undefined) {
      update.winners = Array.isArray(body.winners)
        ? body.winners
            .filter((w) => typeof w === 'string')
            .map((w) => w.slice(0, 24))
            .slice(0, 12)
        : [];
    }

    const room = await TvRoom.findOneAndUpdate({ code }, { $set: update }, { new: true });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// GET /tv/rooms/:code — the TV polls this. Intentionally public.
router.get('/tv/rooms/:code', async (req, res, next) => {
  try {
    const code = normCode(req.params.code);
    const room = await TvRoom.findOne({ code }).lean();
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// DELETE /tv/rooms/:code — the host stops sharing.
router.delete('/tv/rooms/:code', requireKey, async (req, res, next) => {
  try {
    const code = normCode(req.params.code);
    const room = await TvRoom.findOneAndDelete({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
