import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { TIERS } from './questions.js';
import { get, post } from './api.js';
import FamilyKeyPrompt from './FamilyKeyPrompt.jsx';
import { isDemoMode } from './demoMode.js';

// Tier values are identical to the API contract: 'easy' | 'medium' | 'hard'
// ('easy' = Briar Easy 1pt, 'medium' = Wyatt & Pepper Medium 2pts, 'hard' = Grown-Up Hard 3pts).
const MIXES = [
  { id: 'all',  label: 'Whole Family',    desc: 'Easy, medium & hard — everyone plays', tiers: ['easy', 'medium', 'hard'] },
  { id: 'kids', label: 'Kids Only',       desc: 'Easy + medium, for the big-kid crew',  tiers: ['easy', 'medium'] },
  { id: 'hard', label: 'Grown-Ups Only',  desc: 'Hard questions, big points',           tiers: ['hard'] },
  { id: 'easy', label: "Briar's Picks",   desc: 'Easy questions only — warm-up mode',   tiers: ['easy'] },
];

const ROUND_OPTIONS = [2, 3, 4, 5];

const WIN_LINES = [
  'Certified household genius. Frame this moment.',
  'The couch erupts! Confetti made of couch cushions rains down.',
  'Crowned in glory and probably first dibs on dessert.',
  'A trivia legend is born. The trophy is imaginary but the bragging rights are real.',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// API {_id,text,answer,tier,topic} -> client {id,question,answer,tier,topic}
function mapQuestion(q) {
  return {
    id: q._id,
    question: q.text ?? '',
    answer: q.answer ?? '',
    tier: TIERS[q.tier] ? q.tier : 'medium',
    topic: q.topic ?? '',
  };
}

// API {_id,date,players:[{name,score}],rounds,winner} -> history entry
// {date,winners,scores:[[name,score]...],questions}
function mapGame(g) {
  const players = (Array.isArray(g.players) ? g.players : [])
    .map((p) => [p.name ?? '?', Number(p.score) || 0])
    .sort((a, b) => b[1] - a[1]);
  const top = players[0]?.[1] ?? 0;
  const byScore = players.filter(([, s]) => s === top).map(([n]) => n);
  const saved = g.winner
    ? String(g.winner).split(' & ').map((s) => s.trim()).filter(Boolean)
    : [];
  return {
    id: g._id,
    date: g.date,
    winners: saved.length ? saved : byScore,
    scores: players,
    questions: players.length * (Number(g.rounds) || 0),
  };
}

// Fires a ~2.5-3s fireworks sequence exactly once when the results screen mounts.
function ResultsFireworks() {
  useEffect(() => {
    const timers = [];
    const burst = (x, delay, particleCount = 60) => {
      timers.push(
        setTimeout(() => {
          confetti({
            particleCount,
            spread: 100,
            startVelocity: 42,
            origin: { x, y: 0.6 },
            disableForReducedMotion: true,
          });
        }, delay),
      );
    };
    // Opening volley: left, center, right.
    burst(0.2, 0);
    burst(0.5, 250, 80);
    burst(0.8, 500);
    // Delayed encore volleys.
    burst(0.35, 1200);
    burst(0.65, 1500, 80);
    burst(0.5, 2100, 100);
    return () => timers.forEach(clearTimeout);
  }, []);
  return null;
}

// "From Movie Night" section for the setup screen: lists the family's favorite
// movies so each can become a trivia question with one tap. Hides quietly when
// the fetch fails or there are no favorites (never breaks the setup screen).
function MovieFavorites({ onPick }) {
  const [movies, setMovies] = useState(undefined); // undefined = loading/failed -> hidden

  useEffect(() => {
    let alive = true;
    get('/movies')
      .then((list) => {
        if (!alive) return;
        const favs = (Array.isArray(list) ? list : []).filter((m) => m && m.favorite === true);
        setMovies(favs);
      })
      .catch(() => {
        if (alive) setMovies(undefined);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (movies === undefined) return null;

  return (
    <section className="card movie-favorites">
      <h2>🎬 From Movie Night</h2>
      {movies.length === 0 ? (
        <p className="hint" style={{ marginTop: 0 }}>
          No favorite movies yet — tap the ⭐ on movies in Movie Night and they’ll show up here as ready-made trivia answers.
        </p>
      ) : (
        <>
          <p className="hint" style={{ marginTop: 0 }}>
            Your family’s favorite movies, ready to become trivia questions. Pick one, then type the question.
          </p>
          <ul className="custom-list">
            {movies.map((m) => {
              const title = m.title ?? m.name ?? 'Untitled';
              return (
                <li key={m._id || title}>
                  <div>
                    <div>{title}</div>
                    {m.year ? <div className="q-meta">{m.year}</div> : null}
                  </div>
                  <button className="btn-ghost btn-small" onClick={() => onPick(title)}>
                    Make it a question
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export default function App() {
  const demoMode = isDemoMode();
  const [dataState, setDataState] = useState('loading'); // loading | ready | error | need-key
  const [loadError, setLoadError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);

  const [screen, setScreen] = useState('setup'); // setup | game | results
  const [players, setPlayers] = useState(['Philip', 'Jessica', 'Wyatt', 'Pepper', 'Briar']);
  const [rounds, setRounds] = useState(3);
  const [mixId, setMixId] = useState('all');

  // Game state
  const [deck, setDeck] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState({});
  const [awarded, setAwarded] = useState([]); // player names already awarded for the current question
  const [saveNotice, setSaveNotice] = useState('');

  // Add-your-own form state
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [newTier, setNewTier] = useState('medium');
  const [savingQ, setSavingQ] = useState(false);
  const [addError, setAddError] = useState('');

  // Bulk question-pack import state
  const [packText, setPackText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState('');

  async function loadData() {
    setDataState('loading');
    setLoadError('');
    try {
      // Questions, with one-shot auto-seed when the bank is empty.
      let qs = await get('/questions');
      if (!Array.isArray(qs)) qs = [];
      if (qs.length === 0) {
        try {
          await post('/questions/seed', {});
        } catch {
          // Seed may already have run elsewhere; fall through to re-fetch.
        }
        qs = await get('/questions');
        if (!Array.isArray(qs)) qs = [];
      }
      setQuestions(qs.map(mapQuestion));

      // History is nice-to-have: never block the game on it.
      try {
        const gs = await get('/games');
        setHistory((Array.isArray(gs) ? gs : []).map(mapGame).slice(0, 10));
      } catch {
        setHistory([]);
      }

      setDataState('ready');
    } catch (err) {
      if (err && err.status === 401) {
        setDataState('need-key');
      } else {
        setLoadError(err?.message || 'Something went wrong loading trivia data.');
        setDataState('error');
      }
    }
  }

  useEffect(() => {
    loadData();
    const onInvalidKey = () => setDataState('need-key');
    window.addEventListener('family-key-invalid', onInvalidKey);
    return () => window.removeEventListener('family-key-invalid', onInvalidKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveKey(key) {
    localStorage.setItem('familyKey', key);
    loadData();
  }

  const activeMix = MIXES.find((m) => m.id === mixId);
  const poolSize = questions.filter((q) => activeMix.tiers.includes(q.tier)).length;
  const namedPlayers = players.map((p) => p.trim()).filter(Boolean);
  const totalQuestions = namedPlayers.length * rounds;
  const playableQuestions = Math.min(totalQuestions, poolSize);

  function updatePlayer(i, value) {
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }
  function addPlayer() {
    if (players.length < 8) setPlayers((prev) => [...prev, '']);
  }
  function removePlayer(i) {
    setPlayers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startGame() {
    if (namedPlayers.length < 2 || poolSize === 0) return;
    const pool = shuffle(questions.filter((q) => activeMix.tiers.includes(q.tier)));
    setDeck(pool.slice(0, playableQuestions));
    setScores(Object.fromEntries(namedPlayers.map((n) => [n, 0])));
    setQIndex(0);
    setRevealed(false);
    setAwarded([]);
    setSaveNotice('');
    setScreen('game');
  }

  function fireAwardConfetti() {
    confetti({
      particleCount: 75,
      spread: 70,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.25 },
      disableForReducedMotion: true,
    });
  }

  function awardPoints(name) {
    if (awarded.includes(name)) return; // no double-awards
    const q = deck[qIndex];
    const pts = TIERS[q.tier].points;
    setScores((prev) => ({ ...prev, [name]: prev[name] + pts }));
    setAwarded((prev) => [...prev, name]);
    fireAwardConfetti();
  }

  function nextQuestion() {
    if (qIndex + 1 >= deck.length) {
      finishGame();
    } else {
      setQIndex((i) => i + 1);
      setRevealed(false);
      setAwarded([]);
    }
  }

  function finishGame() {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topScore = sorted[0]?.[1] ?? 0;
    const winners = sorted.filter(([, s]) => s === topScore).map(([n]) => n);
    const payload = {
      date: new Date().toISOString(),
      players: sorted.map(([name, score]) => ({ name, score })),
      rounds,
      winner: winners.join(' & '),
    };
    setScreen('results');
    post('/games', payload)
      .then(() => {
        setHistory((prev) => [mapGame({ ...payload }), ...prev].slice(0, 10));
      })
      .catch(() => {
        setSaveNotice('\u26A0\uFE0F Couldn\u2019t save this game to the Hall of Fame \u2014 check your connection and play on!');
      });
  }

  function quitToSetup() {
    setScreen('setup');
  }

  async function addCustomQuestion(e) {
    e.preventDefault();
    const q = newQ.trim();
    const a = newA.trim();
    if (!q || !a || savingQ) return;
    setSavingQ(true);
    setAddError('');
    try {
      const created = await post('/questions', { text: q, answer: a, tier: newTier, topic: 'Family Custom' });
      const mapped = mapQuestion(created || { text: q, answer: a, tier: newTier });
      setQuestions((prev) => [...prev, mapped]);
      setRecentlyAdded((prev) => [mapped, ...prev]);
      setNewQ('');
      setNewA('');
    } catch (err) {
      setAddError(err?.message || 'Couldn\u2019t add that question. Try again.');
    } finally {
      setSavingQ(false);
    }
  }

  // Pre-fill the custom-question form with a Movie Night favorite as the answer,
  // then scroll to and focus the question input so only the question needs typing.
  function pickMovieAsQuestion(title) {
    setNewA(title);
    requestAnimationFrame(() => {
      const el = document.getElementById('new-q');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
      }
    });
  }

  async function importPack() {    setImporting(true);
    setImportError('');
    setImportResult('');
    try {
      let parsed;
      try {
        parsed = JSON.parse(packText);
      } catch {
        throw new Error('That isn\u2019t valid JSON — copy the pack exactly as provided.');
      }
      const arr = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error('No questions found in that JSON.');
      }
      const res = await post('/questions/bulk', { questions: arr });
      const n = res?.imported ?? 0;
      const skipped = res?.skipped ?? 0;
      setImportResult(
        `Imported ${n} question${n === 1 ? '' : 's'}${skipped ? ` (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped)` : ''} — they\u2019re in the bank now!`,
      );
      setPackText('');
      await loadData();
    } catch (err) {
      setImportError(err?.message || 'Couldn\u2019t import that pack. Try again.');
    } finally {
      setImporting(false);
    }
  }

  const current = deck[qIndex];
  const standings = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const leaders = standings.length > 0 ? standings.filter(([, s]) => s === standings[0][1]).map(([n]) => n) : [];

  if (dataState === 'need-key' && !demoMode) {
    return (
      <div className="app">
        <header className="header">
          <span className="bunting" aria-hidden="true">🎉🧠🎉</span>
          <h1>Family Trivia Night</h1>
        </header>
        <FamilyKeyPrompt onSave={saveKey} />
        <footer className="footer">
          Made with ❤️ for the loudest, smartest family on the block.
        </footer>
      </div>
    );
  }

  if (dataState === 'loading') {
    return (
      <div className="app">
        <header className="header">
          <span className="bunting" aria-hidden="true">🎉🧠🎉</span>
          <h1>Family Trivia Night</h1>
        </header>
        <section className="card" style={{ textAlign: 'center' }}>
          <h2>🎲 Shuffling the question cards…</h2>
          <p className="hint">Fetching the family trivia bank. One moment!</p>
        </section>
        <footer className="footer">
          Made with ❤️ for the loudest, smartest family on the block.
        </footer>
      </div>
    );
  }

  if (dataState === 'error') {
    return (
      <div className="app">
        <header className="header">
          <span className="bunting" aria-hidden="true">🎉🧠🎉</span>
          <h1>Family Trivia Night</h1>
        </header>
        <section className="card" style={{ textAlign: 'center' }}>
          <h2>😬 Trivia night hit a snag</h2>
          <p className="hint">{loadError}</p>
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={loadData}>🔄 Retry</button>
          </div>
        </section>
        <footer className="footer">
          Made with ❤️ for the loudest, smartest family on the block.
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      {demoMode && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f9d976, #f39f5a)',
            color: '#5b3a1a',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 600,
            borderBottom: '2px solid rgba(91, 58, 26, 0.15)',
          }}
        >
          🎪 Demo preview — sample data, saved in this browser only.{' '}
          <button
            onClick={() => { localStorage.removeItem('demoData:trivia-night'); window.location.reload(); }}
            style={{
              marginLeft: '8px',
              padding: '3px 12px',
              borderRadius: '999px',
              border: '1px solid #5b3a1a',
              background: 'rgba(255, 255, 255, 0.55)',
              color: '#5b3a1a',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset demo
          </button>
        </div>
      )}
      <header className="header">
        <span className="bunting" aria-hidden="true">🎉🧠🎉</span>
        <h1>Family Trivia Night</h1>
        <p className="subtitle">Grab the couch, pick your teams, and may the brainiest family win.</p>
      </header>

      {screen === 'setup' && (
        <>
          <section className="card">
            <h2>Who's playing?</h2>
            <p className="hint" style={{ marginTop: 0 }}>Two or more players or teams. Tap the ✕ to remove someone.</p>
            {players.map((p, i) => (
              <div className="player-row" key={i}>
                <input
                  type="text"
                  value={p}
                  placeholder={`Player ${i + 1}`}
                  maxLength={24}
                  onChange={(e) => updatePlayer(i, e.target.value)}
                  aria-label={`Player ${i + 1} name`}
                />
                {players.length > 2 && (
                  <button className="remove-btn" onClick={() => removePlayer(i)} aria-label={`Remove player ${i + 1}`}>✕</button>
                )}
              </div>
            ))}
            {players.length < 8 && (
              <button className="btn-ghost btn-small" onClick={addPlayer}>+ Add a player</button>
            )}

            <h2 style={{ marginTop: 28 }}>Question mix</h2>
            <div className="option-grid">
              {MIXES.map((m) => (
                <div
                  key={m.id}
                  className={`mix-card${mixId === m.id ? ' selected' : ''}`}
                  onClick={() => setMixId(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setMixId(m.id)}
                >
                  <strong>{m.label}</strong>
                  <small>{m.desc}</small>
                </div>
              ))}
            </div>

            <h2 style={{ marginTop: 28 }}>Rounds</h2>
            <p className="hint" style={{ marginTop: 0 }}>Each round, every player gets one question.</p>
            <div className="rounds-row">
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r}
                  className={`round-chip${rounds === r ? ' selected' : ''}`}
                  onClick={() => setRounds(r)}
                >
                  {r} rounds
                </button>
              ))}
            </div>

            <div className="start-bar">
              <span className="question-count-note">
                {namedPlayers.length < 2
                  ? 'Add at least two players to start the show!'
                  : `${playableQuestions} questions lined up · ${poolSize} in the bank`}
              </span>
              <button
                className="btn-primary"
                onClick={startGame}
                disabled={namedPlayers.length < 2 || poolSize === 0}
              >
                🎬 Start the show!
              </button>
            </div>
          </section>

          <MovieFavorites onPick={pickMovieAsQuestion} />

          <section className="card">
            <h2>Add your own questions</h2>            <p className="hint" style={{ marginTop: 0 }}>
              Stump the family! Your custom questions are saved for everyone and join the question bank.
            </p>
            <form onSubmit={addCustomQuestion}>
              <label htmlFor="new-q">Question</label>
              <input
                id="new-q"
                type="text"
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="e.g. What is Dad's favorite 80s movie?"
                maxLength={200}
              />
              <label htmlFor="new-a">Answer</label>
              <input
                id="new-a"
                type="text"
                value={newA}
                onChange={(e) => setNewA(e.target.value)}
                placeholder="e.g. The Princess Bride (obviously)"
                maxLength={200}
              />
              <label htmlFor="new-tier">Difficulty</label>
              <select id="new-tier" value={newTier} onChange={(e) => setNewTier(e.target.value)}>
                {Object.values(TIERS).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.points} pt{t.points > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              {addError && <p className="hint" style={{ color: '#b3552e' }}>{addError}</p>}
              <div style={{ marginTop: 16 }}>
                <button type="submit" className="btn-primary" disabled={!newQ.trim() || !newA.trim() || savingQ}>
                  {savingQ ? '⏳ Saving…' : '➕ Add to the bank'}
                </button>
              </div>
            </form>

            {recentlyAdded.length > 0 && (
              <>
                <h3 style={{ marginTop: 24 }}>Your custom questions ({recentlyAdded.length})</h3>
                <ul className="custom-list">
                  {recentlyAdded.map((q) => (
                    <li key={q.id || q.question}>
                      <div>
                        <div>{q.question}</div>
                        <div className="q-meta">{TIERS[q.tier]?.label} · Answer: {q.answer}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {!demoMode && (
            <section className="card">
              <h2>📦 Import a question pack</h2>
              <p className="hint" style={{ marginTop: 0 }}>
                Got a JSON question pack? Paste it below to add every question to the bank at once.
                Each entry needs <code>text</code>, <code>answer</code>, and a <code>tier</code> (easy, medium, or hard).
              </p>
              <label htmlFor="pack-json">Question pack (JSON)</label>
              <textarea
                id="pack-json"
                rows={6}
                value={packText}
                onChange={(e) => setPackText(e.target.value)}
                placeholder='[{"text": "What...", "answer": "...", "tier": "hard", "topic": "80s-music"}]'
              />
              {importError && <p className="hint" style={{ color: '#b3552e' }}>{importError}</p>}
              {importResult && <p className="hint" style={{ color: '#2e7d32' }}>{importResult}</p>}
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!packText.trim() || importing}
                  onClick={importPack}
                >
                  {importing ? '⏳ Importing…' : '📦 Import questions'}
                </button>
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="card hall-of-fame">
              <h2>🏆 Hall of Fame</h2>
              <p className="hint" style={{ marginTop: 0 }}>Past champions, immortalized forever (now synced for the whole family).</p>
              <ul>
                {history.map((h, i) => (
                  <li key={h.id || i}>
                    <strong>{h.winners.join(' & ')}</strong> won with {h.scores[0][1]} pts · {h.questions} questions ·{' '}
                    {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {screen === 'game' && current && (
        <div className="game-layout">
          <section className="card question-card">
            <div className="progress">
              Question {qIndex + 1} of {deck.length}
            </div>
            <span className={`tier-badge tier-${current.tier}`}>{TIERS[current.tier].label}</span>
            <span className="tier-tagline">{TIERS[current.tier].tagline}</span>
            <div className="points-line">Worth {TIERS[current.tier].points} point{TIERS[current.tier].points > 1 ? 's' : ''} ⭐</div>
            <p className="question-text">{current.question}</p>

            {!revealed ? (
              <button className="btn-primary" onClick={() => setRevealed(true)}>
                👀 Reveal the answer
              </button>
            ) : (
              <>
                <div className="answer-box">
                  <span className="answer-label">The answer</span>
                  {current.answer}
                </div>
                <div className="who-got-it">
                  <h3>Who got it right? <small className="hint-inline">(tap everyone who earned it!)</small></h3>
                  <div className="award-grid">
                    {namedPlayers.map((n) => {
                      const got = awarded.includes(n);
                      return (
                        <button
                          key={n}
                          className={`award-btn${got ? ' awarded' : ''}`}
                          onClick={() => awardPoints(n)}
                          disabled={got}
                          aria-pressed={got}
                        >
                          {got ? '✓ ' : ''}{n}<br />
                          <small>+{TIERS[current.tier].points} pts</small>
                        </button>
                      );
                    })}
                    <button className="nobody-btn" onClick={nextQuestion}>
                      Nobody got it 😅
                    </button>
                  </div>
                  <button className="btn-primary next-q-btn" onClick={nextQuestion}>
                    {qIndex + 1 >= deck.length ? 'See the results →' : 'Next question →'}
                  </button>
                </div>
              </>
            )}
          </section>

          <aside className="card scoreboard">
            <h3>📊 Scoreboard</h3>
            {standings.map(([name, pts]) => (
              <div key={name} className={`score-row${leaders.includes(name) && pts > 0 ? ' leader' : ''}`}>
                <span>{leaders.includes(name) && pts > 0 ? '👑 ' : ''}{name}</span>
                <span className="pts">{pts}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <button className="btn-ghost btn-small" onClick={quitToSetup}>End game early</button>
            </div>
          </aside>
        </div>
      )}

      {screen === 'results' && (
        <section className="card results">
          <ResultsFireworks />
          <span className="trophy" aria-hidden="true">🏆</span>
          <h2>And the winner is…</h2>
          {saveNotice && <p className="hint" style={{ color: '#b3552e' }}>{saveNotice}</p>}
          {leaders.length === 1 ? (
            <>
              <div className="winner-name">{leaders[0]}!</div>
              <p>{WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)]}</p>
            </>
          ) : (
            <>
              <div className="winner-name">It's a tie!</div>
              <p>{leaders.join(' & ')} share the crown — a rematch is clearly required.</p>
            </>
          )}
          <div className="final-standings">
            {standings.map(([name, pts], i) => (
              <div key={name} className={`score-row${i === 0 ? ' leader' : ''}`}>
                <span>{i === 0 ? '🥇 ' : `${i + 1}. `}{name}</span>
                <span className="pts">{pts} pts</span>
              </div>
            ))}
          </div>
          <p className="celebrate">Thanks for playing — same time next week? 🎉</p>
          <div className="button-row">
            <button className="btn-primary" onClick={quitToSetup}>🎮 Play again</button>
          </div>
        </section>
      )}

      <footer className="footer">
        Made with ❤️ for the loudest, smartest family on the block.
      </footer>
    </div>
  );
}
