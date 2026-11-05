const express = require('express');
const { Adventure } = require('../models');

const router = express.Router();

// --- Adventure Builder shared state --------------------------------
// One shared document for the whole family, like the Week doc in
// routes/menu.js: build a mission on the laptop, run it from a phone
// in the park — both devices read and write this state.
// Auth is unchanged: server.js gates every /api route behind the
// shared FAMILY_KEY middleware (x-family-key header) before this
// router runs — no key (or a wrong one) is 401 before reaching here.
//
// Endpoints:
//   GET /adventures/state   the shared state (created with defaults
//                           on first read)
//   PUT /adventures/state   partial update — any subset of the state
//                           fields; returns the saved state
//
// The client sends the whole state it holds (debounced), so PUT is a
// "store this" operation with light type checks, not a patch language.
// The log is capped at the newest 200 entries so the doc stays small.

const DEFAULT_SELECTED = ['philip', 'jessica', 'wyatt', 'pepper', 'briar'];
const EMPTY_RECENT = { A: [], B: [], C: [] };
const LOG_CAP = 200;

function serializeState(doc) {
  return {
    customPeople: Array.isArray(doc.customPeople) ? doc.customPeople : [],
    selectedIds: Array.isArray(doc.selectedIds) ? doc.selectedIds : DEFAULT_SELECTED,
    lastRoles: doc.lastRoles && typeof doc.lastRoles === 'object' ? doc.lastRoles : {},
    recent: doc.recent && typeof doc.recent === 'object' ? doc.recent : EMPTY_RECENT,
    activeMission: doc.activeMission ?? null,
    log: Array.isArray(doc.log) ? doc.log : [],
    updatedAt: doc.updatedAt,
  };
}

async function getOrCreateState() {
  let doc = await Adventure.findOne();
  if (!doc) {
    doc = await Adventure.create({});
  }
  return doc;
}

// Normalise an incoming state body. Returns { value } or { error }
// (the route sends 400). Only the known fields are accepted.
function cleanStateInput(body) {
  const input = body && typeof body === 'object' ? body : {};
  const value = {};
  if (input.customPeople !== undefined) {
    if (!Array.isArray(input.customPeople) || input.customPeople.length > 100) {
      return { error: 'customPeople must be a list (max 100 people).' };
    }
    value.customPeople = input.customPeople;
  }
  if (input.selectedIds !== undefined) {
    if (
      !Array.isArray(input.selectedIds)
      || input.selectedIds.some((id) => typeof id !== 'string')
      || input.selectedIds.length > 100
    ) {
      return { error: 'selectedIds must be a list of text ids.' };
    }
    value.selectedIds = input.selectedIds;
  }
  for (const field of ['lastRoles', 'recent']) {
    if (input[field] !== undefined) {
      if (!input[field] || typeof input[field] !== 'object' || Array.isArray(input[field])) {
        return { error: `${field} must be an object.` };
      }
      value[field] = input[field];
    }
  }
  if (input.activeMission !== undefined) {
    if (
      input.activeMission !== null
      && (typeof input.activeMission !== 'object' || Array.isArray(input.activeMission))
    ) {
      return { error: 'activeMission must be an object or null.' };
    }
    value.activeMission = input.activeMission;
  }
  if (input.log !== undefined) {
    if (!Array.isArray(input.log)) return { error: 'log must be a list.' };
    value.log = input.log.slice(0, LOG_CAP);
  }
  return { value };
}

router.get('/adventures/state', async (_req, res, next) => {
  try {
    res.json(serializeState(await getOrCreateState()));
  } catch (err) {
    next(err);
  }
});

router.put('/adventures/state', async (req, res, next) => {
  try {
    const cleaned = cleanStateInput(req.body);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const doc = await getOrCreateState();
    Object.assign(doc, cleaned.value);
    // Mongoose doesn't track in-place edits of Mixed/Object fields on
    // their own — make sure wholesale replacement is marked.
    for (const field of ['lastRoles', 'recent', 'activeMission']) {
      if (cleaned.value[field] !== undefined) doc.markModified(field);
    }
    await doc.save();
    return res.json(serializeState(doc));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
