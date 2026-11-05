# Adventure Builder — build notes

Joined the family-apps suite 2026-11-04 (was a standalone offline
app, v1, built the same day). The generator, content library
(15 missions, 88 hunt items, 14 roles, 14 Raleigh places) and all
screens carried over unchanged; what changed is where state lives:

- **State → family-api.** One shared `Adventure` document
  (family-api/models.js) holds customPeople, selectedIds, lastRoles,
  recent cards, the active mission, and the log, behind
  `GET/PUT /api/adventures/state` (family-api/routes/adventures.js),
  gated by the shared FAMILY_KEY like every sibling.
- **Sync model (kept simple on purpose).** The client fetches the
  state on load and pushes the whole state (600ms debounce) after
  changes. A localStorage cache mirrors the last confirmed state:
  every successful fetch refreshes it, every change writes it
  immediately. If the API is unreachable, the app runs on the cache
  and shows a "📴 Offline copy" badge; offline edits are flagged
  dirty and pushed on the next successful connection (dirty local
  state wins the first sync after an offline stretch; no merging —
  last write wins).
- **v1 carry-over (safety net only).** If the v1 standalone app's
  localStorage record (`adventure-builder-v1`) exists in the same
  browser origin, it seeds the first cache. In practice v1 ran on
  localhost and the suite app runs on its Render origin, so v1's
  on-device log does not migrate — the suite app starts fresh and
  builds its own synced log.
- **Sibling conventions mirrored:** src/api.js (x-family-key,
  401 → prompt, demo interception), FamilyKeyPrompt, demoMode /
  demoData (`?demo=1`), warm cream/terracotta design language,
  manifest + home-screen icons, render.yaml static-service block
  (`adventure-builder`, VITE_API_URL + VITE_FAMILY_KEY).
- The og:url / og:image in index.html use the service name
  (adventure-builder.onrender.com) as a placeholder until the real
  Render URL is known.
