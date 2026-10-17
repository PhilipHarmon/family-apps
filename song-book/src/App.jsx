import { useEffect, useMemo, useRef, useState } from 'react';
import { get, post, put, del } from './api.js';
import FamilyKeyPrompt from './FamilyKeyPrompt.jsx';
import { isDemoMode } from './demoMode.js';

/* Song Book — the Harmon family songwriting studio.
 * Shelf -> New idea -> Song detail (Lyrics sing-along / Learn tabs /
 * Hear it via Suno + GarageBand MIDI / Record our version). */

const STYLES = [
  'Pop', 'Country', 'EDM', 'Reggae', 'Silly', 'Rock',
  'Folk', 'Blues', 'Lullaby', 'Pirate Shanty', 'Disco', 'Punk',
];

const STYLE_EMOJI = {
  Pop: '🎤', Country: '🤠', EDM: '🎧', Reggae: '🌴', Silly: '🤪', Rock: '🎸',
  Folk: '🪕', Blues: '🎷', Lullaby: '🌙', 'Pirate Shanty': '🏴‍☠️', Disco: '🪩', Punk: '🤘',
};

/* Chord shapes: frets low-E -> high-e, -1 = muted. */
const CHORD_SHAPES = {
  C:  { frets: [-1, 3, 2, 0, 1, 0] },
  D:  { frets: [-1, -1, 0, 2, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1] },
  D7: { frets: [-1, -1, 0, 2, 1, 2] },
  E:  { frets: [0, 2, 2, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0] },
  F:  { frets: [1, 3, 3, 2, 1, 1], barre: 1 },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 1] },
  G:  { frets: [3, 2, 0, 0, 0, 3] },
  G7: { frets: [3, 2, 0, 0, 0, 1] },
  A:  { frets: [-1, 0, 2, 2, 2, 0] },
  Am: { frets: [-1, 0, 2, 2, 1, 0] },
  C7: { frets: [-1, 3, 2, 3, 1, 0] },
};

function parseChords(progression) {
  if (!progression) return [];
  const toks = progression.match(/[A-G][#b]?(?:maj7|maj|min|sus4|sus2|add9|dim|aug|m|7|9)?/g) || [];
  return [...new Set(toks)];
}

function ChordDiagram({ name }) {
  const shape = CHORD_SHAPES[name];
  if (!shape) {
    return (
      <div className="chord-card">
        <div className="chord-name">{name}</div>
        <div className="tiny">diagram coming soon</div>
      </div>
    );
  }
  const frets = shape.frets;
  const maxF = Math.max(...frets);
  const baseFret = maxF > 4 ? maxF - 3 : 0;
  const rows = 4;
  const padL = 18, padT = 32, strW = 15, fretH = 24;
  const W = padL * 2 + strW * 5;
  const H = padT + rows * fretH + 12;
  const fretY = (f) => padT + (f - baseFret) * fretH;

  return (
    <div className="chord-card">
      <div className="chord-name">{name}</div>
      <svg width={W} height={H} role="img" aria-label={`${name} chord diagram`}>
        {/* strings */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1={padL + i * strW} y1={padT}
            x2={padL + i * strW} y2={padT + rows * fretH}
            stroke="#c4b5fd" strokeWidth={i === 0 || i === 5 ? 2.5 : 1.5}
          />
        ))}
        {/* frets */}
        {Array.from({ length: rows + 1 }, (_, r) => (
          <line
            key={r}
            x1={padL} y1={fretY(baseFret + r)}
            x2={padL + strW * 5} y2={fretY(baseFret + r)}
            stroke="#c4b5fd" strokeWidth={r === 0 && baseFret === 0 ? 4 : 1.2}
          />
        ))}
        {baseFret > 0 && (
          <text x={W - 4} y={padT + 12} fill="#a78bfa" fontSize="11" textAnchor="end">
            {baseFret}fr
          </text>
        )}
        {/* barre */}
        {shape.barre && (
          <rect
            x={padL - 6} y={fretY(shape.barre) - fretH / 2 - 5}
            width={strW * 5 + 12} height={10} rx={5}
            fill="#fbbf24"
          />
        )}
        {/* finger dots / mutes */}
        {frets.map((f, i) => {
          const x = padL + i * strW;
          if (f === -1) {
            return (
              <text key={i} x={x} y={padT - 10} fill="#f87171" fontSize="13" textAnchor="middle" fontWeight="bold">×</text>
            );
          }
          if (f === 0) {
            return (
              <circle key={i} cx={x} cy={padT - 12} r={5} fill="none" stroke="#34d399" strokeWidth={2} />
            );
          }
          if (shape.barre && f === shape.barre) return null; // covered by the barre
          return (
            <circle key={i} cx={x} cy={fretY(f) - fretH / 2} r={6.5} fill="#fbbf24" />
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- helpers ---------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

function downloadMidi(song) {
  if (!song.midiData) return false;
  try {
    const bin = atob(song.midiData);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = String(song.title || 'song')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'song';
    a.href = url;
    a.download = `${slug}.mid`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

function sunoExportText(song) {
  const lines = [];
  lines.push(`Style: ${song.sunoPrompt || song.style || ''}`);
  lines.push('');
  lines.push('Lyrics:');
  (song.lyricsSections || []).forEach((sec) => {
    lines.push(`[${sec.label || 'Section'}]`);
    (sec.lines || []).forEach((l) => lines.push(l));
    lines.push('');
  });
  return lines.join('\n').trim();
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function StageNotes() {
  const notes = [
    { ch: '♪', left: '6%', top: '12%', size: '2rem', delay: '0s' },
    { ch: '♫', left: '88%', top: '8%', size: '2.6rem', delay: '2s' },
    { ch: '♩', left: '12%', top: '68%', size: '2.2rem', delay: '4s' },
    { ch: '♪', left: '82%', top: '74%', size: '1.8rem', delay: '1s' },
    { ch: '♫', left: '48%', top: '4%', size: '1.6rem', delay: '3s' },
  ];
  return (
    <div className="stage-notes" aria-hidden="true">
      {notes.map((n, i) => (
        <span key={i} style={{ left: n.left, top: n.top, fontSize: n.size, animationDelay: n.delay }}>
          {n.ch}
        </span>
      ))}
    </div>
  );
}

/* ---------- sing-along ---------- */

function SingAlong({ song }) {
  const words = useMemo(() => {
    const arr = [];
    (song.lyricsSections || []).forEach((sec, si) => {
      (sec.lines || []).forEach((line, li) => {
        String(line)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((w, wi) => arr.push({ w, si, li, wi, idx: arr.length }));
      });
    });
    return arr;
  }, [song]);

  const [active, setActive] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const [bpm, setBpm] = useState(song.tempo || 112);

  useEffect(() => {
    if (!active || !auto || wordIndex >= words.length) return;
    const ms = Math.max(280, (60000 / bpm) * 0.8);
    const t = setTimeout(() => setWordIndex((i) => Math.min(i + 1, words.length)), ms);
    return () => clearTimeout(t);
  }, [active, auto, wordIndex, bpm, words.length]);

  const finished = active && wordIndex >= words.length;

  const start = () => {
    setWordIndex(0);
    setActive(true);
  };

  let counter = 0;
  return (
    <div>
      {!active && !finished && (
        <button className="btn btn-block" onClick={start}>
          🎤 Start sing-along
        </button>
      )}
      {(active || finished) && (
        <div>
          <div
            onClick={() => {
              if (active && !finished) setWordIndex((i) => Math.min(i + 1, words.length));
            }}
            style={{ cursor: active && !finished ? 'pointer' : 'default' }}
          >
            {(song.lyricsSections || []).map((sec, si) => (
              <div className="lyric-section" key={si}>
                <div className="lyric-label">{sec.label}</div>
                {(sec.lines || []).map((line, li) => (
                  <p className="lyric-line" key={li}>
                    {String(line)
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((w) => {
                        const idx = counter++;
                        const isActive = active && !finished && idx === wordIndex;
                        return (
                          <span key={idx} className={`w${isActive ? ' active' : ''}`}>
                            {isActive && <span className="bounce-dot" aria-hidden="true" />}
                            {w}{' '}
                          </span>
                        );
                      })}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {finished ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem' }}>🎉</div>
              <h2>You sang it!</h2>
              <p className="muted">Encore? Encore!</p>
              <button className="btn" onClick={start}>Sing it again</button>
            </div>
          ) : (
            <div className="singalong-controls">
              <div className="btn-row" style={{ marginBottom: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setWordIndex((i) => Math.min(i + 1, words.length))}
                >
                  Next word →
                </button>
                <button
                  className={`btn ${auto ? '' : 'btn-secondary'}`}
                  onClick={() => setAuto((a) => !a)}
                  aria-pressed={auto}
                >
                  {auto ? '⏸ Auto-dot: on' : '▶ Auto-dot: off'}
                </button>
              </div>
              <label className="tiny" htmlFor="sing-bpm">
                Dot speed: <span className="tempo-read">{bpm} BPM</span>
              </label>
              <input
                id="sing-bpm"
                type="range" min="60" max="170" value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
              />
              <p className="tiny" style={{ margin: '6px 0 0' }}>
                Sing-along mode — tap the lyrics or let the dot lead at your tempo.
                The dot follows you, not audio.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- recorder ---------- */

function Recorder({ song, onSaved }) {
  const [recState, setRecState] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const stop = () => {
    clearInterval(timerRef.current);
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    setRecState('idle');
  };

  const upload = async (blob) => {
    setSaving(true);
    setError('');
    try {
      const url = await blobToDataURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const updated = await put(`/songs/${song._id}`, {
        recordings: [...(song.recordings || []), { date: today, url }],
      });
      onSaved(updated);
    } catch {
      setError('Could not save the recording. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        upload(new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' }));
      };
      mrRef.current = mr;
      mr.start();
      setRecState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= 180) {
            stop();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone unavailable — allow microphone access and try again.');
    }
  };

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(1, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div>
      {recState === 'recording' ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span className="rec-dot" aria-hidden="true" />
            <span className="rec-timer">{mmss}</span>
          </div>
          <p className="muted">Recording… sing your hearts out!</p>
          <button className="btn btn-block" onClick={stop}>⏹ Stop & save</button>
        </div>
      ) : (
        <button className="btn btn-block" onClick={start} disabled={saving}>
          🎙 {saving ? 'Saving…' : 'Record our version'}
        </button>
      )}
      {error && <p className="tiny" style={{ color: '#f87171' }}>{error}</p>}
      <p className="tiny">Up to 3 minutes. Your recording is saved with the song for the whole family to replay.</p>

      <h3>🎧 Family recordings</h3>
      {(!song.recordings || song.recordings.length === 0) && (
        <p className="muted">No recordings yet — yours could be the first!</p>
      )}
      {(song.recordings || []).map((r, i) => (
        <div className="rec-row" key={i}>
          <span style={{ fontSize: '1.4rem' }} aria-hidden="true">🎵</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tiny">{r.date || 'Family take'}</div>
            <audio controls src={r.url} style={{ width: '100%' }} preload="metadata" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- main app ---------- */

export default function App() {
  const demoMode = isDemoMode();
  const [dataState, setDataState] = useState('loading'); // loading|ready|need-key|error
  const [loadError, setLoadError] = useState('');
  const [songs, setSongs] = useState([]);
  const [screen, setScreen] = useState('shelf'); // shelf|new|detail
  const [selectedId, setSelectedId] = useState(null);

  const loadSongs = async () => {
    setDataState('loading');
    setLoadError('');
    try {
      const list = await get('/songs');
      setSongs(Array.isArray(list) ? list : []);
      setDataState('ready');
    } catch (err) {
      if (err && (err.status === 401 || err.unauthorized)) {
        setDataState('need-key');
      } else {
        setLoadError(err?.message || 'Something went wrong loading songs.');
        setDataState('error');
      }
    }
  };

  useEffect(() => {
    loadSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveKey = (key) => {
    try {
      localStorage.setItem('familyKey', key);
    } catch {
      /* ignore */
    }
    loadSongs();
  };

  const openSong = (id) => {
    setSelectedId(id);
    setScreen('detail');
    window.scrollTo(0, 0);
  };

  const goShelf = () => {
    setScreen('shelf');
    setSelectedId(null);
    window.scrollTo(0, 0);
  };

  const refreshSelected = async (id) => {
    try {
      const s = await get(`/songs/${id}`);
      setSongs((prev) => prev.map((x) => (x._id === id ? s : x)));
      return s;
    } catch {
      return null;
    }
  };

  const seedDemo = async () => {
    try {
      await post('/songs/seed', {});
      await loadSongs();
    } catch (err) {
      setLoadError(err?.message || 'Could not load the demo song.');
    }
  };

  const selected = songs.find((s) => s._id === selectedId) || null;

  return (
    <div className="app">
      <StageNotes />
      <header className="app-header">
        <h1><span className="note-accent">♪</span> Song Book <span className="note-accent">♫</span></h1>
        <p>Dream it. Learn it. Play it. 🎸</p>
      </header>

      {dataState === 'need-key' && !demoMode && (
        <FamilyKeyPrompt onSave={saveKey} />
      )}

      {dataState === 'loading' && (
        <div className="loading">🎵 Tuning up…</div>
      )}

      {dataState === 'error' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2>😢 Out of tune</h2>
          <p className="muted">{loadError}</p>
          <button className="btn" onClick={loadSongs}>Try again</button>
        </div>
      )}

      {dataState === 'ready' && screen === 'shelf' && (
        <Shelf songs={songs} onOpen={openSong} onNew={() => setScreen('new')} onSeed={seedDemo} />
      )}

      {dataState === 'ready' && screen === 'new' && (
        <NewIdea
          onBack={goShelf}
          onCreated={(song) => {
            setSongs((prev) => [song, ...prev]);
            openSong(song._id);
          }}
        />
      )}

      {dataState === 'ready' && screen === 'detail' && selected && (
        <SongDetail
          song={selected}
          onBack={goShelf}
          onUpdated={(updated) => {
            setSongs((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
          }}
          onDeleted={() => {
            setSongs((prev) => prev.filter((x) => x._id !== selected._id));
            goShelf();
          }}
          onRefresh={() => refreshSelected(selected._id)}
        />
      )}

      <footer style={{ textAlign: 'center', marginTop: 28 }}>
        <p className="tiny">Made with ❤️ for the loudest family band on the block.</p>
      </footer>
    </div>
  );
}

/* ---------- shelf ---------- */

function Shelf({ songs, onOpen, onNew, onSeed }) {
  return (
    <div>
      <button className="btn btn-block" onClick={onNew} style={{ marginBottom: 16 }}>
        ＋ New song idea
      </button>

      {songs.length === 0 ? (
        <div className="empty">
          <div className="big">🎼</div>
          <h2 style={{ fontFamily: 'var(--display-font)' }}>No songs yet!</h2>
          <p className="muted">Start with a wild idea — or load the demo song to see how it all works.</p>
          <div className="btn-row" style={{ maxWidth: 420, margin: '16px auto 0' }}>
            <button className="btn btn-secondary" onClick={onSeed}>Load demo song</button>
            <button className="btn" onClick={onNew}>New idea</button>
          </div>
        </div>
      ) : (
        songs.map((s) => (
          <button key={s._id} className="song-row" onClick={() => onOpen(s._id)}>
            <span className="emoji" aria-hidden="true">{STYLE_EMOJI[s.style] || '🎵'}</span>
            <span className="meta">
              <span className="title">{s.title || 'Untitled song'}</span>
              <br />
              {s.style && <span className="chip style">{s.style}</span>}
              <span className={`chip ${s.status === 'idea' ? 'idea' : ''}`}>
                <span className="dot" aria-hidden="true">{s.status === 'idea' ? '💡' : '🎶'}</span>
                {s.status === 'idea' ? 'Idea' : 'Composed'}
              </span>
              {s.tempo && <span className="chip">{s.tempo} BPM</span>}
            </span>
            <span className="chev" aria-hidden="true">›</span>
          </button>
        ))
      )}
    </div>
  );
}

/* ---------- new idea ---------- */

function NewIdea({ onBack, onCreated }) {
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [style, setStyle] = useState('Silly');
  const [tempo, setTempo] = useState(112);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!idea.trim()) {
      setError('Give Fred a little something to work with — a theme, a phrase, anything!');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const song = await post('/songs', {
        title: title.trim() || 'Untitled song',
        idea: idea.trim(),
        style,
        tempo,
      });
      onCreated(song);
    } catch (err) {
      setError(err?.message || 'Could not save the idea. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button className="back-link" onClick={onBack}>‹ Back to the shelf</button>
      <div className="card">
        <h2>💡 New song idea</h2>
        <div className="field">
          <label htmlFor="song-title">Song title (optional)</label>
          <input
            id="song-title" type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The Dinosaur Stomp"
            maxLength={120}
          />
        </div>
        <div className="field">
          <label htmlFor="song-idea">What should the song be about?</label>
          <textarea
            id="song-idea" value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Themes, phrases, even some lyrics… dump it all here and Fred will turn it into a real song."
            maxLength={2000}
          />
        </div>
        <div className="field">
          <label>Pick a style</label>
          <div className="style-grid" role="group" aria-label="Song style">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                className="style-chip"
                aria-pressed={style === s}
                onClick={() => setStyle(s)}
              >
                {STYLE_EMOJI[s]} {s}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="song-tempo">Tempo: <span className="tempo-read">{tempo} BPM</span></label>
          <input
            id="song-tempo" type="range" min={60} max={170} value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
          />
        </div>
        {error && <p className="tiny" style={{ color: '#f87171' }}>{error}</p>}
        <button className="btn btn-block" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '🚀 Send it to Fred'}
        </button>
        <p className="tiny" style={{ marginTop: 10 }}>
          Fred composes the song — lyrics, chords, tabs and all — and it lands right here on the shelf.
        </p>
      </div>
    </div>
  );
}

/* ---------- song detail ---------- */

const DETAIL_TABS = [
  { id: 'lyrics', label: '🎤 Lyrics' },
  { id: 'learn', label: '🎸 Learn' },
  { id: 'hear', label: '🔊 Hear it' },
  { id: 'record', label: '🎙 Our version' },
];

function SongDetail({ song, onBack, onUpdated, onDeleted, onRefresh }) {
  const [tab, setTab] = useState('lyrics');
  const [learnTab, setLearnTab] = useState('guitar');
  const [sunoState, setSunoState] = useState('idle'); // idle|copied|failed
  const [deleting, setDeleting] = useState(false);

  const isIdea = song.status === 'idea';
  const chordNames = useMemo(() => {
    const names = [];
    (song.chords || []).forEach((c) => {
      parseChords(c.progression).forEach((n) => {
        if (!names.includes(n)) names.push(n);
      });
    });
    return names;
  }, [song]);

  const doDelete = async () => {
    if (!window.confirm(`Delete "${song.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await del(`/songs/${song._id}`);
      onDeleted();
    } catch {
      setDeleting(false);
    }
  };

  const openSuno = async () => {
    const ok = await copyText(sunoExportText(song));
    setSunoState(ok ? 'copied' : 'failed');
    window.open('https://suno.com', '_blank', 'noopener');
    setTimeout(() => setSunoState('idle'), 6000);
  };

  return (
    <div>
      <button className="back-link" onClick={onBack}>‹ Back to the shelf</button>

      <div className="song-hero">
        <span style={{ fontSize: '2.6rem' }} aria-hidden="true">{STYLE_EMOJI[song.style] || '🎵'}</span>
        <h1>{song.title}</h1>
        <div>
          {song.style && <span className="chip style">{song.style}</span>}
          <span className={`chip ${isIdea ? 'idea' : ''}`}>{isIdea ? '💡 Idea' : '🎶 Composed'}</span>
          {song.tempo && <span className="chip">{song.tempo} BPM</span>}
        </div>
        {song.idea && <p className="muted" style={{ fontStyle: 'italic' }}>“{song.idea}”</p>}
      </div>

      {isIdea ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🎼</div>
          <h2>Waiting on Fred…</h2>
          <p className="muted">
            This one's still an idea. Send the idea to Fred and he'll compose
            the full song — lyrics, chords, tabs, the works.
          </p>
          <button className="btn btn-ghost" onClick={doDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete this idea'}
          </button>
        </div>
      ) : (
        <div>
          <div className="tab-bar" role="tablist" aria-label="Song sections">
            {DETAIL_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className="tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'lyrics' && (
            <div className="card">
              <SingAlong song={song} />
            </div>
          )}

          {tab === 'learn' && (
            <div className="card">
              <div className="subtab-bar" role="tablist" aria-label="Instruments">
                {[
                  { id: 'guitar', label: '🎸 Guitar' },
                  { id: 'bass', label: '🎸 Bass' },
                  { id: 'piano', label: '🎹 Piano' },
                ].map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={learnTab === t.id}
                    className="subtab"
                    onClick={() => setLearnTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {(song.chords || []).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {(song.chords || []).map((c, i) => (
                    <div key={i} className="tiny" style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--accent)' }}>{c.section}:</strong> {c.progression}
                    </div>
                  ))}
                </div>
              )}

              {learnTab === 'guitar' && (
                <div>
                  {chordNames.length > 0 && (
                    <div>
                      <h3>Chord shapes</h3>
                      <div className="chord-grid">
                        {chordNames.map((n) => <ChordDiagram key={n} name={n} />)}
                      </div>
                    </div>
                  )}
                  {song.guitarTab ? (
                    <div>
                      <h3>Strumming & chart</h3>
                      <div className="tab-text">{song.guitarTab}</div>
                    </div>
                  ) : (
                    <p className="muted">Guitar tab hasn't been written for this song yet.</p>
                  )}
                </div>
              )}

              {learnTab === 'bass' && (
                song.bassTab
                  ? <div className="tab-text">{song.bassTab}</div>
                  : <p className="muted">Bass tab hasn't been written for this song yet.</p>
              )}

              {learnTab === 'piano' && (
                song.pianoScore
                  ? <div className="tab-text">{song.pianoScore}</div>
                  : <p className="muted">Piano score hasn't been written for this song yet.</p>
              )}
            </div>
          )}

          {tab === 'hear' && (
            <div className="card">
              <h2>🔊 Hear it</h2>
              <div className="hear-row">
                <div>
                  <button className="btn btn-block" onClick={openSuno}>
                    🎧 Copy lyrics & open Suno
                  </button>
                  {sunoState === 'copied' && (
                    <div className="hint" style={{ marginTop: 10 }}>
                      ✅ Lyrics + style copied! In Suno:
                      <ol>
                        <li>Choose <strong>Custom Mode</strong></li>
                        <li>Paste into the <strong>Lyrics</strong> box (the Style line goes in the Style field)</li>
                        <li>Hit <strong>Generate</strong> 🎶</li>
                      </ol>
                    </div>
                  )}
                  {sunoState === 'failed' && (
                    <p className="tiny" style={{ color: '#f87171' }}>
                      Copy didn't work on this browser — Suno is open anyway; you can paste the lyrics from the Lyrics tab.
                    </p>
                  )}
                  {sunoState === 'idle' && (
                    <p className="tiny" style={{ marginTop: 8 }}>
                      Copies the lyrics + style prompt, then opens Suno — paste into Custom Mode and generate your demo.
                    </p>
                  )}
                </div>

                <div>
                  <button
                    className="btn btn-block btn-secondary"
                    onClick={() => {
                      if (!downloadMidi(song)) {
                        // fall through to the hint below
                      }
                    }}
                    disabled={!song.midiData}
                  >
                    🎹 Download MIDI for GarageBand
                  </button>
                  {song.midiData ? (
                    <div className="hint" style={{ marginTop: 10 }}>
                      🎹 <strong>GarageBand route (free!):</strong>
                      <ol>
                        <li>Tap above to download the <strong>.mid</strong> file</li>
                        <li>On iPhone: open the <strong>Files</strong> app → Downloads → tap the .mid file → share → <strong>Open in GarageBand</strong></li>
                        <li>It plays with real instrument sounds — add drums, remix it, make it yours!</li>
                      </ol>
                    </div>
                  ) : (
                    <p className="tiny" style={{ marginTop: 8 }}>
                      No MIDI file for this song yet — ask Fred to compose one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'record' && (
            <div className="card">
              <h2>🎙 Our version</h2>
              <p className="muted">Learned it? Play it together and keep the take forever.</p>
              <Recorder song={song} onSaved={(updated) => { onUpdated(updated); }} />
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button className="btn-ghost btn" onClick={doDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : '🗑 Delete this song'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
