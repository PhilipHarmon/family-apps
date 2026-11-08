const express = require('express');
const { Storybook } = require('../models');

const router = express.Router();

// --- Mission Storybook shelf ----------------------------------------
// Finished storybooks, one document per book, saved by Adventure
// Builder when the family taps "Make our storybook" on a completed
// mission (button only — never automatic; see the scope in
// ~/workspace/big-builds/storybook-scope.md). Books are immutable
// keepsakes here: they are saved verbatim, listed, read back and
// deleted — never regenerated or edited by the API.
// Auth is unchanged: server.js gates every /api route behind the
// shared FAMILY_KEY middleware (x-family-key header) before this
// router runs. Deleting a book is an adults-only action in the
// product, but that rule is enforced HUB-side (the Hub bridge knows
// who is asking; this API only ever sees the family key) — do not
// grow a second auth model here.
//
// Endpoints:
//   POST   /storybooks        save a finished book (201)
//   GET    /storybooks        the shelf, newest first, LIGHT fields
//                             only (no page array — the Hub grid and
//                             the app list don't need the prose)
//   GET    /storybooks/:id    one full book, pages and all
//   DELETE /storybooks/:id    remove a book

const PAGE_TYPES = ['cover', 'call', 'quest', 'completion', 'photos'];
const MAX_PAGES = 12; // contract books are 6–7 pages; headroom, not a target
const MAX_PHOTOS = 6; // the field-photos step caps attachments at ~6

function serializeBook(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    place: doc.place || '',
    date: doc.date || '',
    setting: doc.setting || '',
    coverIllustration: doc.coverIllustration || '',
    crew: (doc.crew || []).map((c) => ({ name: c.name, role: c.role || '' })),
    pages: (doc.pages || []).map((p) => ({
      type: p.type,
      illustration: p.illustration || '',
      title: p.title || '',
      lines: [...(p.lines || [])],
      items: [...(p.items || [])],
      photos: [...(p.photos || [])],
    })),
    createdBy: doc.createdBy || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// The shelf card: identity + cover only.
function serializeListEntry(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    place: doc.place || '',
    date: doc.date || '',
    coverIllustration: doc.coverIllustration || '',
    createdAt: doc.createdAt,
  };
}

function stringList(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

// Normalise an incoming book body. Returns { value } or { error }
// (the route sends 400). Validation is deliberately minimal — the
// assembler is the author and its contract is fixed — but the shelf
// never stores a shapeless book.
function cleanBookInput(body) {
  const input = body && typeof body === 'object' ? body : {};
  if (typeof input.title !== 'string' || !input.title.trim()) {
    return { error: 'A storybook needs a title.' };
  }
  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    return { error: 'A storybook needs at least one page.' };
  }
  if (input.pages.length > MAX_PAGES) {
    return { error: `A storybook has at most ${MAX_PAGES} pages.` };
  }
  const pages = [];
  for (const page of input.pages) {
    if (!page || typeof page !== 'object' || !PAGE_TYPES.includes(page.type)) {
      return { error: `Every page needs a type of: ${PAGE_TYPES.join(', ')}.` };
    }
    if (page.lines !== undefined && !stringList(page.lines)) {
      return { error: 'Page lines must be a list of text.' };
    }
    if (page.items !== undefined && !stringList(page.items)) {
      return { error: 'Page items must be a list of text.' };
    }
    if (page.photos !== undefined && !stringList(page.photos)) {
      return { error: 'Page photos must be a list of media references.' };
    }
    pages.push({
      type: page.type,
      illustration: typeof page.illustration === 'string' ? page.illustration : '',
      title: typeof page.title === 'string' ? page.title : '',
      lines: page.lines || [],
      items: page.items || [],
      photos: (page.photos || []).slice(0, MAX_PHOTOS),
    });
  }
  const crew = [];
  if (input.crew !== undefined) {
    if (!Array.isArray(input.crew)) return { error: 'crew must be a list.' };
    for (const member of input.crew) {
      if (!member || typeof member.name !== 'string' || !member.name.trim()) {
        return { error: 'Every crew member needs a name.' };
      }
      crew.push({
        name: member.name,
        role: typeof member.role === 'string' ? member.role : '',
      });
    }
  }
  const cover = pages.find((p) => p.type === 'cover');
  return {
    value: {
      title: input.title.trim(),
      place: typeof input.place === 'string' ? input.place : '',
      date: typeof input.date === 'string' ? input.date : '',
      setting: typeof input.setting === 'string' ? input.setting : '',
      coverIllustration:
        typeof input.coverIllustration === 'string'
          ? input.coverIllustration
          : cover
            ? cover.illustration
            : '',
      crew,
      pages,
      createdBy: typeof input.createdBy === 'string' ? input.createdBy : '',
    },
  };
}

router.post('/storybooks', async (req, res, next) => {
  try {
    const cleaned = cleanBookInput(req.body);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const doc = await Storybook.create(cleaned.value);
    return res.status(201).json(serializeBook(doc));
  } catch (err) {
    return next(err);
  }
});

router.get('/storybooks', async (_req, res, next) => {
  try {
    const docs = await Storybook.find().sort({ createdAt: -1, _id: -1 });
    return res.json({ storybooks: docs.map(serializeListEntry) });
  } catch (err) {
    return next(err);
  }
});

router.get('/storybooks/:id', async (req, res, next) => {
  try {
    const doc = await Storybook.findById(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ error: 'Storybook not found' });
    return res.json(serializeBook(doc));
  } catch (err) {
    return next(err);
  }
});

router.delete('/storybooks/:id', async (req, res, next) => {
  try {
    const doc = await Storybook.findByIdAndDelete(req.params.id).catch(() => null);
    if (!doc) return res.status(404).json({ error: 'Storybook not found' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
