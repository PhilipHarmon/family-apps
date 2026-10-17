import { useEffect, useState } from 'react';
import { get, post, del, getFamilyKey, setFamilyKey } from './api.js';
import { isDemoMode } from './demoMode.js';
import FamilyKeyPrompt from './FamilyKeyPrompt.jsx';
import Spinner from './components/Spinner.jsx';
import AudioNote from './components/AudioNote.jsx';

const DEFAULT_TELLERS = ['Philip', 'Jessica', 'Wyatt', 'Pepper', 'Briar'];
const TELLER_HUES = [18, 45, 160, 320, 265, 200, 90, 0];

const tellerColor = (tellers, name) => {
  const i = Math.max(0, tellers.indexOf(name));
  return TELLER_HUES[i % TELLER_HUES.length];
};

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
};

let uid = 0;
const nid = () => `t-${Date.now()}-${uid++}`;

export default function App() {
  const demoMode = isDemoMode();
  const [familyKey, setFamilyKeyState] = useState(() => getFamilyKey());
  const [promptError, setPromptError] = useState('');

  const [view, setView] = useState('shelf'); // shelf | setup | telling | reading
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Setup
  const [setupTellers, setSetupTellers] = useState(
    DEFAULT_TELLERS.map((name) => ({ id: nid(), name }))
  );

  // Telling session
  const [tellers, setTellers] = useState([]);
  const [pool, setPool] = useState([]);          // names left to spin this round
  const [order, setOrder] = useState([]);        // picked names in order [{name, round}]
  const [round, setRound] = useState(1);
  const [current, setCurrent] = useState(null);  // name whose turn it is
  const [draft, setDraft] = useState('');
  const [draftAudio, setDraftAudio] = useState('');
  const [passages, setPassages] = useState([]);
  const [roundToast, setRoundToast] = useState('');
  const [titleModal, setTitleModal] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  // Reading
  const [activeStory, setActiveStory] = useState(null);

  const authed = demoMode || !!familyKey;

  const handleUnauthorized = () => {
    setFamilyKeyState('');
    setPromptError('That family key didn\u2019t work — please enter it again.');
  };

  const saveKey = (key) => {
    setFamilyKey(key);
    setPromptError('');
    setFamilyKeyState(key);
  };

  const loadStories = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await get('/stories');
      setStories(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err && err.unauthorized) handleUnauthorized();
      else setLoadError('Could not load stories. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  /* ---------- setup ---------- */
  const goSetup = () => {
    setSetupTellers(DEFAULT_TELLERS.map((name) => ({ id: nid(), name })));
    setView('setup');
  };

  const beginTelling = () => {
    const names = setupTellers.map((t) => t.name.trim()).filter(Boolean);
    if (names.length < 2) {
      setActionError('Add at least two storytellers to begin.');
      return;
    }
    setActionError('');
    setTellers(names);
    setPool([...names]);
    setOrder([]);
    setRound(1);
    setCurrent(null);
    setDraft('');
    setDraftAudio('');
    setPassages([]);
    setView('telling');
  };

  /* ---------- telling ---------- */
  const handleLanded = (name) => {
    setPool((p) => p.filter((n) => n !== name));
    setOrder((o) => [...o, { name, round }]);
    setCurrent(name);
    setDraft('');
    setDraftAudio('');
  };

  const savePassage = () => {
    const text = draft.trim();
    if (!text && !draftAudio) return;
    setPassages((p) => [...p, { teller: current, text, round, audioUrl: draftAudio }]);
    setDraft('');
    setDraftAudio('');
    setCurrent(null);
    if (pool.length === 0) {
      const nextRound = round + 1;
      setRound(nextRound);
      setPool([...tellers]);
      setRoundToast(`Round ${round} complete! Spin again for round ${nextRound} ✨`);
      window.setTimeout(() => setRoundToast(''), 3500);
    }
  };

  const undoLastPassage = () => {
    if (passages.length === 0) return;
    const removed = passages[passages.length - 1];
    const key = `${removed.teller}#${removed.round}`;
    const idx = order.map((e) => `${e.name}#${e.round}`).lastIndexOf(key);
    if (idx >= 0) setOrder(order.slice(0, idx).concat(order.slice(idx + 1)));
    if (!pool.includes(removed.teller)) setPool([...pool, removed.teller]);
    if (removed.round < round) setRound(removed.round);
    setCurrent(null);
    setDraft('');
    setDraftAudio('');
    setPassages(passages.slice(0, -1));
  };

  const confirmSaveStory = async () => {
    const title = titleDraft.trim();
    if (!title) {
      setActionError('Give the story a title first.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const story = await post('/stories', { title, tellers, passages });
      setTitleModal(false);
      setTitleDraft('');
      setActiveStory(story);
      setView('reading');
      loadStories();
    } catch (err) {
      if (err && err.unauthorized) handleUnauthorized();
      else setActionError('Could not save the story. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const openStory = async (id) => {
    setLoading(true);
    try {
      const story = await get(`/stories/${id}`);
      if (story) {
        setActiveStory(story);
        setView('reading');
      }
    } catch (err) {
      if (err && err.unauthorized) handleUnauthorized();
    } finally {
      setLoading(false);
    }
  };

  const deleteStory = async (id) => {
    if (!window.confirm('Delete this story forever?')) return;
    try {
      await del(`/stories/${id}`);
      if (activeStory && activeStory._id === id) {
        setActiveStory(null);
        setView('shelf');
      }
      loadStories();
    } catch (err) {
      if (err && err.unauthorized) handleUnauthorized();
    }
  };

  /* ---------- screens ---------- */
  if (!familyKey && !demoMode) {
    return (
      <div className="app">
        <Starfield />
        <FamilyKeyPrompt error={promptError} onSave={saveKey} />
      </div>
    );
  }

  return (
    <div className="app">
      <Starfield />
      <header className="topbar">
        <button
          className="btn btn-ghost topbar-back"
          onClick={() => {
            if (view === 'telling') {
              if (!window.confirm('Leave without saving this story?')) return;
            }
            setView('shelf');
            setActiveStory(null);
          }}
          aria-label="Back to shelf"
        >
          ← Shelf
        </button>
        <h1 className="topbar-title">📖 Story Book</h1>
        <span className="topbar-spacer" />
      </header>

      {demoMode && (
        <div className="demo-banner">Demo mode — stories stay on this device.</div>
      )}

      {view === 'shelf' && (
        <Shelf
          stories={stories}
          loading={loading}
          loadError={loadError}
          onOpen={openStory}
          onDelete={deleteStory}
          onNew={goSetup}
          onRetry={loadStories}
        />
      )}

      {view === 'setup' && (
        <Setup
          tellers={setupTellers}
          setTellers={setSetupTellers}
          onStart={beginTelling}
          actionError={actionError}
        />
      )}

      {view === 'telling' && (
        <Telling
          tellers={tellers}
          pool={pool}
          order={order}
          round={round}
          current={current}
          draft={draft}
          setDraft={setDraft}
          onAudio={setDraftAudio}
          onLanded={handleLanded}
          onSavePassage={savePassage}
          onUndo={undoLastPassage}
          passages={passages}
          roundToast={roundToast}
          onSaveStory={() => {
            setTitleDraft('');
            setTitleModal(true);
          }}
          actionError={actionError}
        />
      )}

      {view === 'reading' && activeStory && (
        <Reading story={activeStory} onDelete={() => deleteStory(activeStory._id)} />
      )}

      {titleModal && (
        <div className="modal-backdrop" onClick={() => !saving && setTitleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Name your story">
            <h2>✨ Name your story</h2>
            <p className="muted">
              {passages.length} passage{passages.length === 1 ? '' : 's'} from {tellers.length} storytellers.
            </p>
            <input
              className="title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="e.g. The Dragon Who Lost His Roar"
              maxLength={80}
              autoFocus
            />
            {actionError && <p className="key-error">{actionError}</p>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setTitleModal(false)} disabled={saving}>
                Keep telling
              </button>
              <button className="btn btn-primary" onClick={confirmSaveStory} disabled={saving || !titleDraft.trim()}>
                {saving ? 'Saving…' : 'Save story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= background ================= */

function Starfield() {
  const stars = [
    { l: '8%', t: '12%', s: 3, d: '0s' }, { l: '22%', t: '6%', s: 2, d: '1.2s' },
    { l: '38%', t: '16%', s: 4, d: '0.6s' }, { l: '55%', t: '8%', s: 2, d: '2s' },
    { l: '70%', t: '14%', s: 3, d: '1.5s' }, { l: '86%', t: '7%', s: 2, d: '0.3s' },
    { l: '93%', t: '22%', s: 3, d: '1.8s' }, { l: '5%', t: '30%', s: 2, d: '2.4s' },
    { l: '15%', t: '44%', s: 3, d: '0.9s' }, { l: '48%', t: '4%', s: 2, d: '2.8s' },
    { l: '78%', t: '32%', s: 2, d: '1.1s' }, { l: '30%', t: '26%', s: 2, d: '2.1s' },
  ];
  return (
    <div className="starfield" aria-hidden="true">
      {stars.map((st, i) => (
        <span
          key={i}
          className="star"
          style={{ left: st.l, top: st.t, width: st.s, height: st.s, animationDelay: st.d }}
        />
      ))}
      <span className="moon" aria-hidden="true">🌙</span>
    </div>
  );
}

/* ================= shelf ================= */

function Shelf({ stories, loading, loadError, onOpen, onDelete, onNew, onRetry }) {
  return (
    <main className="screen">
      <div className="hero">
        <h2 className="hero-title">Once upon a dinner time…</h2>
        <p className="hero-sub">Spin the wheel, take turns, and tell a story together.</p>
        <button className="btn btn-primary btn-big" onClick={onNew}>
          ＋ New story
        </button>
      </div>

      {loading && <p className="muted center">Opening the bookshelf…</p>}
      {loadError && (
        <div className="error-card">
          <p>{loadError}</p>
          <button className="btn btn-ghost" onClick={onRetry}>Try again</button>
        </div>
      )}

      {!loading && !loadError && stories.length === 0 && (
        <div className="empty-card">
          <div className="empty-emoji" aria-hidden="true">📚</div>
          <p>No stories yet. Gather the family and spin the first tale!</p>
        </div>
      )}

      <div className="story-grid">
        {stories.map((s) => (
          <article key={s._id} className="story-card" onClick={() => onOpen(s._id)}>
            <h3>{s.title || 'Untitled story'}</h3>
            <p className="muted small">
              {fmtDate(s.createdAt)} · {(s.tellers || []).length} tellers · {(s.passages || []).length} passages
            </p>
            <div className="card-actions" onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-ghost btn-small" onClick={() => onDelete(s._id)} aria-label={`Delete ${s.title}`}>
                🗑 Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

/* ================= setup ================= */

function Setup({ tellers, setTellers, onStart, actionError }) {
  const [newName, setNewName] = useState('');

  const add = () => {
    const name = newName.trim();
    if (!name || tellers.length >= 8) return;
    setTellers((t) => [...t, { id: nid(), name }]);
    setNewName('');
  };

  return (
    <main className="screen">
      <h2 className="screen-title">Who's telling tonight?</h2>
      <p className="muted">The spinner will pick from this list — everyone gets a turn before anyone goes twice.</p>

      <ul className="teller-list">
        {tellers.map((t, i) => (
          <li key={t.id} className="teller-row" style={{ '--hue': tellerColor(tellers.map((x) => x.name), t.name) }}>
            <span className="teller-dot" aria-hidden="true" />
            <input
              value={t.name}
              maxLength={24}
              onChange={(e) =>
                setTellers((ts) => ts.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))
              }
              aria-label={`Storyteller ${i + 1} name`}
            />
            {tellers.length > 2 && (
              <button
                className="btn btn-ghost btn-small"
                onClick={() => setTellers((ts) => ts.filter((x) => x.id !== t.id))}
                aria-label={`Remove ${t.name}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      {tellers.length < 8 && (
        <div className="add-row">
          <input
            value={newName}
            maxLength={24}
            placeholder="Add someone…"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-label="Add a storyteller"
          />
          <button className="btn btn-ghost" onClick={add} disabled={!newName.trim()}>
            ＋ Add
          </button>
        </div>
      )}

      {actionError && <p className="key-error">{actionError}</p>}

      <button className="btn btn-primary btn-big" onClick={onStart}>
        Start the story →
      </button>
    </main>
  );
}

/* ================= telling ================= */

function Telling({
  tellers, pool, order, round, current, draft, setDraft, onAudio,
  onLanded, onSavePassage, onUndo, passages, roundToast, onSaveStory, actionError,
}) {
  return (
    <main className="screen">
      <div className="round-banner" aria-live="polite">
        <span>Round {round}</span>
        <span className="muted small">{passages.length} passage{passages.length === 1 ? '' : 's'} so far</span>
      </div>

      {roundToast && <div className="toast" role="status">{roundToast}</div>}

      {!current ? (
        <section className="card">
          <h2 className="screen-title">Who goes next?</h2>
          <Spinner names={pool} onLanded={onLanded} disabled={false} />
        </section>
      ) : (
        <section className="card turn-card" style={{ '--hue': tellerColor(tellers, current) }}>
          <h2 className="turn-title">🌟 Your turn, {current}!</h2>
          <label className="field">
            <span className="field-label">What happens next in the story?</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={`${current} says…`}
              autoFocus
            />
          </label>
          <p className="dictate-tip">🎙️ Tip: tap the <strong>microphone on your keyboard</strong> to dictate instead of typing.</p>
          <AudioNote onChange={onAudio} key={current + round + order.length} />
          <div className="row-actions">
            <button className="btn btn-primary" onClick={onSavePassage} disabled={!draft.trim()}>
              Save passage ✓
            </button>
          </div>
          {actionError && <p className="key-error">{actionError}</p>}
        </section>
      )}

      {order.length > 0 && (
        <section className="card">
          <h3 className="card-title">Turn order</h3>
          <ol className="order-list">
            {order.map((entry, i) => {
              const saved = passages.find(
                (p) => p.teller === entry.name && p.round === entry.round
              );
              const isCurrent = current === entry.name && !saved;
              return (
                <li
                  key={`${entry.name}-${entry.round}-${i}`}
                  className={`order-row${isCurrent ? ' is-current' : ''}${saved ? ' is-saved' : ''}`}
                  style={{ '--hue': tellerColor(tellers, entry.name) }}
                >
                  <span className="order-num">{i + 1}</span>
                  <div className="order-body">
                    <strong>{entry.name}</strong>
                    <span className="muted small"> · round {entry.round}</span>
                    {saved && saved.text && <p className="order-text">{saved.text}</p>}
                    {saved && saved.audioUrl && (
                      <audio controls src={saved.audioUrl} className="order-audio" />
                    )}
                    {isCurrent && <span className="turn-badge">writing…</span>}
                    {saved && <span className="turn-badge saved">✓ saved</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="bottom-actions">
        {passages.length > 0 && (
          <button className="btn btn-ghost" onClick={onUndo}>
            ↩ Undo last passage
          </button>
        )}
        <button
          className="btn btn-primary btn-big"
          onClick={onSaveStory}
          disabled={passages.length === 0}
        >
          📖 Save story
        </button>
      </div>
      <p className="muted small center">The magic book comes later — Fred turns finished stories into illustrated books ✨</p>
    </main>
  );
}

/* ================= reading ================= */

function Reading({ story, onDelete }) {
  const passages = story.passages || [];
  return (
    <main className="screen">
      <article className="card reading-card">
        <h2 className="reading-title">{story.title || 'Untitled story'}</h2>
        <p className="muted small center">
          {fmtDate(story.createdAt)} · {(story.tellers || []).join(', ')}
        </p>
        <div className="reading-body">
          {passages.map((p, i) => (
            <section key={i} className="passage">
              <p className="passage-teller" style={{ '--hue': tellerColor(story.tellers || [], p.teller) }}>
                <span className="teller-dot" aria-hidden="true" /> {p.teller}
              </p>
              <p className="passage-text">{p.text}</p>
              {p.audioUrl && <audio controls src={p.audioUrl} className="order-audio" />}
            </section>
          ))}
          {passages.length === 0 && <p className="muted">No passages in this story yet.</p>}
        </div>
        <div className="magic-placeholder">
          <div className="magic-emoji" aria-hidden="true">✨📚✨</div>
          <p><strong>The magic book for this story appears here after Fred makes it.</strong></p>
          <p className="muted small">Illustrated pages, narration, and page-turns — coming in the storybook pilot.</p>
        </div>
        <button className="btn btn-ghost" onClick={onDelete}>
          🗑 Delete this story
        </button>
      </article>
    </main>
  );
}
