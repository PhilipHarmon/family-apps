# Song Book — Build Notes (2026-10-13, family-apps v11)

## What it is
The Harmon family's songwriting studio: kids dream up song ideas, Fred composes
real songs, and the app is where the family learns them, hears demos, and records
their own versions.

## Screens
- **Shelf** — song list (title, style chip, Idea/Composed badge, tempo), big
  "＋ New song idea" button, "Load demo song" when empty (POST /songs/seed).
- **New idea** — title (optional), big idea text box, 12 style chips
  (Pop, Country, EDM, Reggae, Silly, Rock, Folk, Blues, Lullaby, Pirate Shanty,
  Disco, Punk), tempo slider (60–170 BPM, default 112). Saves as status 'idea'.
- **Song detail** (composed songs) — four tabs:
  - **🎤 Lyrics** — big readable lyrics + **sing-along mode**: a bouncing dot
    advances word by word. Tap-to-advance or auto-dot with BPM slider.
    Honestly labeled as sing-along (the dot follows your tempo, not audio).
  - **🎸 Learn** — Guitar / Bass / Piano sub-tabs. Guitar: rendered SVG chord
    diagrams (12 common shapes) + strumming pattern + chord chart. Bass: tab
    text. Piano: chord chart + simplified melody with lyric underlay.
  - **🔊 Hear it** — "Copy lyrics & open Suno": copies lyrics + style prompt to
    the clipboard, opens suno.com in a new tab, shows the 3-step Custom Mode
    hint. "Download MIDI for GarageBand": downloads the song's .mid
    (decoded from the stored base64) with the Files → GarageBand import hint.
  - **🎙 Our version** — MediaRecorder-based recorder (up to 3 min), uploads
    as a data URL via PUT /songs/:id, lists family recordings with playback.
- Idea-status songs show a "Waiting on Fred…" card instead of the tabs.

## API (family-api, routes/songs.js)
Song model: title, idea, style, tempo, status ('idea'|'composed'),
lyricsSections [{label, lines[]}], chords [{section, progression}],
guitarTab, bassTab, pianoScore, midiData (base64 .mid), sunoPrompt,
recordings [{date, url}], timestamps.
Endpoints: GET/POST /songs, GET/PUT/DELETE /songs/:id,
GET /songs/:id/midi (audio/midi download, `song-title.mid`),
POST /songs/seed (seeds the demo song if the collection is empty).

## Demo song: "The Harmon Family Band"
Silly, key of C, 112 BPM. Verse C–F–G–F, chorus C–G–Am–F, outro F–G–C.
Structure: Verse / Chorus / Verse / Chorus / Outro. The .mid was generated
with Python + mido (melody track, nylon-guitar chord stabs, kick/snare/hat
drums + count-in bar) and verified by re-reading with mido before embedding
(3 tracks, 780 note-ons, 5998 bytes).

## Design
Joyful music-studio look: deep indigo/violet gradient, floating ♪ motifs
(paused under prefers-reduced-motion), rounded cards, huge touch targets,
rounded system font stack for display type (no webfont downloads).
PWA manifest + icons included (Safari → Share → Add to Home Screen).

## Demo mode
?demo=1 serves the demo song from localStorage — full flow works offline,
no family key needed.

## Build
- `npm run build` — clean, no errors. Output in `dist/`.
- No git commit made (per instructions).

## What Philip needs to know
- Standard family-apps merge flow (ditto from ~/Downloads into his repo
  clone, push, Render rebuilds). **Step zero: delete old unzipped bundle
  folders from ~/Downloads first.**
- render.yaml gains the 6th app service (`song-book`); no env changes.
- The family-api service redeploys with the new /songs routes (needs the
  existing MONGO_URI — already set).
- After deploy: open Song Book → "Load demo song" to seed "The Harmon
  Family Band" (manual one-tap seed; the shelf offers it when empty).
- Suno flow needs no keys: the app copies lyrics + opens suno.com; Philip
  pastes into Custom Mode on Suno's free tier.
