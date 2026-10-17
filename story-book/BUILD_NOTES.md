# Story Book — Build Notes (2026-10-13)

The dinner-table storytelling game, digitized: spin a fair wheel to pick who
tells next, everyone adds a passage in turn, save the finished story. The
illustrated "magic book" step comes later (Fred + Philip) — this app is the
capture side only.

## Screens
- **Shelf** (`view === 'shelf'`): saved stories (title, date, teller + passage
  counts), big "＋ New story" button, delete per story.
- **Setup**: editable teller list (defaults Philip, Jessica, Wyatt, Pepper,
  Briar; add up to 8, rename inline, remove down to 2). "Start the story →".
- **Telling** (the core):
  - **Spinner** (`src/components/Spinner.jsx`): a real spinning wheel
    (conic-gradient segments, gold pointer). Winner is chosen uniformly at
    random from the remaining pool *before* the spin; the wheel animates
    (~4.2s ease-out) so the pointer lands on them. No replacement within a
    round — when the hat is empty the round completes and the pool resets.
    `prefers-reduced-motion` skips the animation and picks instantly.
  - **Turn order**: numbered list; the current teller's card glows with
    "🌟 Your turn, X!". Saved passages show inline with ✓.
  - **Passage box**: textarea for what the person says + dictation tip
    (iOS Safari has no in-browser speech recognition, so the tip points at
    the keyboard microphone instead of a fake mic button) + optional
    **voice-note recorder** (`AudioNote.jsx`, MediaRecorder → base64 data
    URL stored on the passage as `audioUrl`, so it rides inside the normal
    JSON API with no file-upload endpoint).
  - "Save passage ✓" clears the box for the next spin; "↩ Undo last
    passage" restores the teller to the hat; "📖 Save story" opens a title
    modal and POSTs `{ title, tellers, passages }`.
- **Reading**: full story straight through (teller chips, audio playback),
  then the magic-book placeholder: "The magic book for this story appears
  here after Fred makes it ✨".

## Conventions followed
- Same `api.js` client (family key header, `ApiError`, `?demo=1` support),
  `FamilyKeyPrompt`, `demoMode` as the other apps. Demo mode serves the
  seed story from `src/data/seed-story.json` via `src/demoData.js`.
- PWA: `public/manifest.webmanifest` + icons (192/512/maskable/apple-touch),
  iOS standalone meta tags in `index.html` — same pattern as dinner-menu v10.
- Phone-first: min 44–52px touch targets, `100dvh`, safe-area padding,
  hover effects inside `@media (hover: hover)`, reduced-motion respected.

## API used (family-api, see `backend-patches/`)
- `GET /stories`, `POST /stories`, `GET /stories/:id`, `PUT /stories/:id`,
  `DELETE /stories/:id`, `POST /stories/seed`.

## Build
- `npm run build` — clean. Output in `dist/`.
