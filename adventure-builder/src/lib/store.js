// Adventure Builder state — server-synced since the app joined the
// family-apps suite (Nov 2026), so a mission built on the laptop is
// waiting on a phone in the park.
//
// The family API holds the shared state (family-api:
// routes/adventures.js). This module keeps a read-through cache of
// that state on the device: every successful fetch refreshes the
// cache, and every change is written to the cache immediately, so
// the app always opens — even with no signal — showing the last
// mission it saw. Writes made while offline live in the cache and
// are pushed on the next successful connection (the app re-tries on
// the next change and whenever the browser reports it's back
// online). Last write wins; the app doesn't try to merge two
// devices' offline edits — that would be gold-plating a park tool.

import { get, put } from '../api.js';

export const DEFAULT_STATE = {
  customPeople: [],
  selectedIds: ['philip', 'jessica', 'wyatt', 'pepper', 'briar'],
  lastRoles: {},
  recent: { A: [], B: [], C: [] },
  log: [],
  active: null,
};

const CACHE_KEY = 'adventure-builder-cache-v2';

// The v1 standalone app kept state under this key. If a v1 record
// exists in this browser (same origin), its people/log/active
// mission seed the first cache. In practice v1 ran on localhost and
// the suite app runs on its Render origin, so this is a safety net,
// not the migration path — v1's log stays behind on the laptop.
const LEGACY_KEY = 'adventure-builder-v1';

function normalise(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  return { ...DEFAULT_STATE, ...parsed };
}

export function loadCachedState() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return normalise(JSON.parse(raw)) || { ...DEFAULT_STATE };
  } catch {
    // fall through to the legacy / default state
  }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const state = normalise(JSON.parse(legacy));
      if (state) {
        cacheState(state);
        return state;
      }
    }
  } catch {
    // ignore — defaults below
  }
  return { ...DEFAULT_STATE };
}

export function cacheState(state) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the app still works for this session.
  }
}

// "Dirty" = the cache holds changes the server has never confirmed.
// Persisted next to the cache so it survives the app being closed in
// the park and reopened at home: on the next successful fetch, dirty
// local state is pushed (it wins) instead of being overwritten by
// whatever the server last saw.
const DIRTY_KEY = 'adventure-builder-cache-dirty';

export function cacheIsDirty() {
  try {
    return localStorage.getItem(DIRTY_KEY) === '1';
  } catch {
    return false;
  }
}

export function setCacheDirty(dirty) {
  try {
    if (dirty) localStorage.setItem(DIRTY_KEY, '1');
    else localStorage.removeItem(DIRTY_KEY);
  } catch {
    // ignore — worst case the next load re-fetches from the server
  }
}

// Server <-> client shape: identical, except the API calls the active
// mission `activeMission` and the client calls it `active`.
export function fromServer(server) {
  if (!server || typeof server !== 'object') return { ...DEFAULT_STATE };
  return normalise({ ...server, active: server.activeMission ?? null }) || { ...DEFAULT_STATE };
}

export function toServer(state) {
  return {
    customPeople: state.customPeople,
    selectedIds: state.selectedIds,
    lastRoles: state.lastRoles,
    recent: state.recent,
    activeMission: state.active ?? null,
    log: state.log,
  };
}

export async function fetchServerState() {
  return fromServer(await get('/adventures/state'));
}

export async function pushServerState(state) {
  return fromServer(await put('/adventures/state', toServer(state)));
}
