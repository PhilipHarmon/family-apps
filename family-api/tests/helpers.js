// Shared test harness: boots the REAL menu router + family-key
// middleware (wired exactly like server.js) against a throwaway
// in-memory MongoDB, so tests exercise the production code paths.
//
// One-time local setup (test-only dependency, deliberately NOT in
// package.json — the app itself never requires it):
//   npm install --no-save mongodb-memory-server
// Then: npm test

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KEY = 'test-key';

async function boot() {
  // Data dir on the real filesystem, NOT the default tmpdir: in this
  // environment /tmp is a small tmpfs that mongod's data files fill
  // (which crashes mongod with an fassert). Cleaned up on shutdown.
  const cacheRoot = path.join(os.homedir(), '.cache', 'family-api-tests');
  fs.mkdirSync(cacheRoot, { recursive: true });
  const dbPath = fs.mkdtempSync(path.join(cacheRoot, 'mongo-'));
  const mongod = await MongoMemoryServer.create({ instance: { dbPath } });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  process.env.FAMILY_KEY = KEY;
  const app = express();
  app.use(express.json());
  app.use('/api', require('../middleware/requireKey'));
  app.use('/api', require('../routes/menu'));
  app.use((err, _req, res, _next) => {
    const status = err && err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Server error' });
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  return { mongod, server, uri, base };
}

async function shutdown(ctx) {
  ctx.server.close();
  await mongoose.disconnect();
  const dbPath = ctx.mongod.instanceInfo && ctx.mongod.instanceInfo.dbPath;
  await ctx.mongod.stop();
  if (dbPath) fs.rmSync(dbPath, { recursive: true, force: true });
}

async function reset() {
  const { Recipe, Week, SuggestionSet, PantryStaples } = require('../models');
  await Promise.all([
    Recipe.deleteMany({}),
    Week.deleteMany({}),
    SuggestionSet.deleteMany({}),
    PantryStaples.deleteMany({}),
  ]);
}

function makeClient(base) {
  return async function req(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'x-family-key': KEY, 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* leave json null */
    }
    return { status: res.status, json };
  };
}

module.exports = { boot, shutdown, reset, makeClient, KEY };
