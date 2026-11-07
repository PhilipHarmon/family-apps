import { useEffect, useMemo, useRef, useState } from 'react';
import { FAMILY, BANDS, BAND_EMOJI, EXTRA_COLORS } from './data/family.js';
import { SETTINGS, DURATIONS, DRIVES, COST_PICKS, labelOf, driveBadge, costBadge } from './lib/labels.js';
import { buildCards, rerollCard, buildBriefing } from './lib/generate.js';
import {
  loadCachedState,
  cacheState,
  cacheIsDirty,
  setCacheDirty,
  toServer,
  fetchServerState,
  pushServerState,
} from './lib/store.js';
import FamilyKeyPrompt from './FamilyKeyPrompt.jsx';
import { isDemoMode } from './demoMode.js';
import Avatar from './components/Avatar.jsx';
import Briefing from './components/Briefing.jsx';
import Live from './components/Live.jsx';
import { StorybookFlow, StorybookShelf, StorybookReader } from './components/Storybook.jsx';

const CARD_KINDS = {
  A: { banner: '⚡ Right Now, Free', cls: 'kind-a' },
  B: { banner: '🧭 Out & About', cls: 'kind-b' },
  C: { banner: '🛣️ Worth the Drive', cls: 'kind-c' },
};

function pushRecent(recent, kind, key) {
  const list = [...(recent[kind] || []), key].slice(-6);
  return { ...recent, [kind]: list };
}

function OptionCard({ card, onChoose, onReroll }) {
  const kind = CARD_KINDS[card.kind];
  return (
    <article className={`option-card ${kind.cls}`}>
      <p className="kind-banner">{kind.banner}</p>
      <h3>{card.title}</h3>
      <p className="pitch">{card.pitch}</p>
      <div className="badge-row">
        <span className="badge">{labelOf(SETTINGS, card.setting)}</span>
        <span className="badge">{labelOf(DURATIONS, card.duration)}</span>
        <span className="badge">{driveBadge(card.drive)}</span>
        <span className="badge">{costBadge(card.cost)}</span>
        {card.fallback && <span className="badge badge-warm">Made-up mission</span>}
      </div>
      {card.placeId && <p className="rough-note">Drive &amp; cost are a rough guide — check before you go.</p>}
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={() => onChoose(card)}>
          This one →
        </button>
        <button type="button" className="btn" onClick={() => onReroll(card.kind)}>
          🎲 Different one
        </button>
      </div>
    </article>
  );
}

function ChipGroup({ title, options, value, onChange }) {
  return (
    <fieldset className="chip-group">
      <legend>{title}</legend>
      <div className="chips">
        {options.map((o) => (
          <button
            type="button"
            key={o.id}
            className={`chip${value === o.id ? ' on' : ''}`}
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
          >
            {o.emoji} {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function App() {
  const [store, setStore] = useState(loadCachedState);
  const [phase, setPhase] = useState('loading'); // loading | need-key | ready
  const [online, setOnline] = useState(true);
  const [view, setView] = useState('home');
  const [picks, setPicks] = useState({ setting: 'nature', duration: 'afternoon', drive: 'short', cost: 'free' });
  const [cards, setCards] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [newName, setNewName] = useState('');
  const [newBand, setNewBand] = useState('mid');
  const [completed, setCompleted] = useState(null); // last finished mission, for the storybook flow
  const [reading, setReading] = useState(null); // book open in the reader overlay

  const demoMode = isDemoMode();
  const storeRef = useRef(store);
  const hydratedRef = useRef(false); // a GET has succeeded at least once
  const lastSyncedRef = useRef(null); // JSON of the last state the server confirmed
  const pushingRef = useRef(false);
  const syncNowRef = useRef(() => {});

  // Push the local state to the family API (or, before the first
  // successful fetch, fetch first — local changes made offline win
  // that first sync; see lib/store.js). Re-registered after every
  // render so it always closes over fresh state setters.
  useEffect(() => {
    syncNowRef.current = async () => {
      if (pushingRef.current) return;
      pushingRef.current = true;
      try {
        if (!hydratedRef.current) {
          const serverState = await fetchServerState();
          hydratedRef.current = true;
          setOnline(true);
          setPhase('ready');
          if (!cacheIsDirty()) {
            // Nothing local to protect — adopt the server's state.
            lastSyncedRef.current = JSON.stringify(toServer(serverState));
            if (JSON.stringify(toServer(storeRef.current)) !== lastSyncedRef.current) {
              storeRef.current = serverState;
              setStore(serverState);
              cacheState(serverState);
            }
            return;
          }
          // The cache holds offline edits the server never saw — they
          // win this first sync; push below.
        }
        const saved = await pushServerState(storeRef.current);
        lastSyncedRef.current = JSON.stringify(toServer(saved));
        setCacheDirty(false);
        setOnline(true);
        setPhase('ready');
      } catch (err) {
        if (err && err.status === 401) {
          setPhase('need-key');
        } else {
          setOnline(false);
          setPhase((p) => (p === 'loading' ? 'ready' : p));
        }
      } finally {
        pushingRef.current = false;
      }
    };
  });

  // First load: try the server; fall back to the on-device cache.
  useEffect(() => {
    syncNowRef.current();
    const onInvalidKey = () => { if (!isDemoMode()) setPhase('need-key'); };
    const onOnline = () => syncNowRef.current();
    window.addEventListener('family-key-invalid', onInvalidKey);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('family-key-invalid', onInvalidKey);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Every change: refresh the on-device cache at once, then push to
  // the server (debounced) whenever the state differs from what the
  // server last confirmed.
  useEffect(() => {
    storeRef.current = store;
    cacheState(store);
    if (phase === 'loading') return undefined;
    if (JSON.stringify(toServer(store)) === lastSyncedRef.current) return undefined;
    setCacheDirty(true);
    const timer = setTimeout(() => syncNowRef.current(), 600);
    return () => clearTimeout(timer);
  }, [store, phase]);

  function saveKey(key) {
    localStorage.setItem('familyKey', key);
    hydratedRef.current = false;
    lastSyncedRef.current = null;
    setPhase('loading');
    syncNowRef.current();
  }

  const people = useMemo(() => [...FAMILY, ...store.customPeople], [store.customPeople]);
  const selectedPeople = useMemo(
    () => people.filter((p) => store.selectedIds.includes(p.id)),
    [people, store.selectedIds],
  );

  const togglePerson = (id) => {
    setStore((s) => ({
      ...s,
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    }));
  };

  const addPerson = () => {
    const name = newName.trim();
    if (!name) return;
    const person = {
      id: `guest-${Date.now()}`,
      name,
      band: newBand,
      color: EXTRA_COLORS[store.customPeople.length % EXTRA_COLORS.length],
    };
    setStore((s) => ({
      ...s,
      customPeople: [...s.customPeople, person],
      selectedIds: [...s.selectedIds, person.id],
    }));
    setNewName('');
  };

  const buildAdventure = () => {
    const built = buildCards(picks, Math.random, store.recent);
    setCards(built);
    setStore((s) => {
      let recent = s.recent;
      for (const kind of ['A', 'B', 'C']) recent = pushRecent(recent, kind, built[kind].key);
      return { ...s, recent };
    });
    setView('options');
  };

  const doReroll = (kind) => {
    const fresh = rerollCard(kind, picks, Math.random, store.recent, cards[kind].key);
    setCards((c) => ({ ...c, [kind]: fresh }));
    setStore((s) => ({ ...s, recent: pushRecent(s.recent, kind, fresh.key) }));
  };

  const chooseCard = (card) => {
    setBriefing(buildBriefing(card, selectedPeople, store.lastRoles, Math.random));
    setView('briefing');
  };

  const startMission = () => {
    const roles = Object.fromEntries(briefing.roles.map((r) => [r.personId, r.roleId]));
    setStore((s) => ({
      ...s,
      lastRoles: { ...s.lastRoles, ...roles },
      active: { briefing, checked: [], startedAt: new Date().toISOString() },
    }));
    setView('live');
  };

  const toggleHuntItem = (text) => {
    setStore((s) => {
      if (!s.active) return s;
      const checked = s.active.checked.includes(text)
        ? s.active.checked.filter((t) => t !== text)
        : [...s.active.checked, text];
      return { ...s, active: { ...s.active, checked } };
    });
  };

  const completeMission = () => {
    // Snapshot the finished mission before `active` clears — the
    // storybook flow builds the book from exactly this payload.
    if (store.active) {
      setCompleted({
        briefing: store.active.briefing,
        checked: [...store.active.checked],
        startedAt: store.active.startedAt,
        completedAt: new Date().toISOString(),
      });
    }
    setStore((s) => {
      if (!s.active) return s;
      const entry = {
        date: new Date().toISOString(),
        title: s.active.briefing.title,
        setting: s.active.briefing.setting,
        who: s.active.briefing.roles.map((r) => r.name),
        found: s.active.checked.length,
      };
      return { ...s, log: [entry, ...s.log], active: null };
    });
    setView('done');
  };

  const activeBriefing = store.active?.briefing;

  if (phase === 'need-key' && !demoMode) {
    return (
      <div className="wrap">
        <header className="app-header">
          <h1>🧭 Adventure Builder</h1>
          <p className="tagline">Family missions, made to order — a role for everyone.</p>
        </header>
        <FamilyKeyPrompt onSave={saveKey} />
        <footer className="app-footer">
          <p>Adventure Builder — build it at home, run it from your phone. 🧭</p>
          <p className="shs-credit">⌛ Built by <a href="https://stolenhourssoftware.github.io" target="_blank" rel="noreferrer">Stolen Hours Software</a> — built after bedtime.</p>
        </footer>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="wrap">
        <header className="app-header">
          <h1>🧭 Adventure Builder</h1>
          <p className="tagline">Family missions, made to order — a role for everyone.</p>
        </header>
        <main>
          <section className="resume-card" style={{ textAlign: 'center' }}>
            <h2>🗺️ Unrolling the map…</h2>
            <p className="hint">Fetching the family&rsquo;s adventures. One moment!</p>
          </section>
        </main>
        <footer className="app-footer">
          <p>Adventure Builder — build it at home, run it from your phone. 🧭</p>
          <p className="shs-credit">⌛ Built by <a href="https://stolenhourssoftware.github.io" target="_blank" rel="noreferrer">Stolen Hours Software</a> — built after bedtime.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="app-header">
        <h1>🧭 Adventure Builder</h1>
        <p className="tagline">Family missions, made to order — a role for everyone.</p>
        {!demoMode && (
          <p className="sync-line" role="status">
            {online
              ? <span className="sync-badge ok">☁️ Synced — same mission on every device</span>
              : <span className="sync-badge off">📴 Offline copy — changes saved here, will sync later</span>}
          </p>
        )}
      </header>

      {view === 'home' && (
        <main>
          {store.active && activeBriefing && (
            <section className="resume-card">
              <h2>🗺️ Mission in progress</h2>
              <p>
                <strong>{activeBriefing.title}</strong> — {store.active.checked.length} finds so far.
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={() => setView('live')}>
                  ▶️ Back to the mission
                </button>
              </div>
            </section>
          )}

          <button type="button" className="btn btn-primary btn-hero" onClick={() => setView('who')}>
            🧭 Plan a new adventure
          </button>
          <button type="button" className="btn btn-hero sb-entry" onClick={() => setView('storybooks')}>
            📚 My Storybooks
          </button>

          <section className="log-section">
            <h2>🏆 Adventure Log</h2>
            {store.log.length === 0 ? (
              <p className="hint">No adventures logged yet. The first one is going to be a good one.</p>
            ) : (
              <ul className="log-list">
                {store.log.map((entry, i) => (
                  <li key={i} className="log-entry">
                    <span className="log-date">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="log-title">{entry.title}</span>
                    <span className="log-who">with {entry.who.join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      )}

      {view === 'who' && (
        <main>
          <h2 className="screen-title">Who’s coming?</h2>
          <p className="hint">Tap everyone who’s in. Every single person gets a role — that’s the rule.</p>
          <div className="people-grid">
            {people.map((p) => {
              const on = store.selectedIds.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`person-chip${on ? ' on' : ''}`}
                  onClick={() => togglePerson(p.id)}
                  aria-pressed={on}
                >
                  <Avatar person={p} size={48} />
                  <span className="person-name">{p.name}</span>
                  <span className="person-band">{BAND_EMOJI[p.band]} {BANDS.find((b) => b.id === p.band)?.label}</span>
                  <span className="person-check" aria-hidden="true">{on ? '✅' : '⬜'}</span>
                </button>
              );
            })}
          </div>

          <form
            className="add-person"
            onSubmit={(e) => { e.preventDefault(); addPerson(); }}
          >
            <h3>Bringing someone else?</h3>
            <div className="add-row">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (grandparent, cousin, friend…)"
                aria-label="New person's name"
              />
              <select value={newBand} onChange={(e) => setNewBand(e.target.value)} aria-label="Age band">
                {BANDS.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              <button type="submit" className="btn">➕ Add</button>
            </div>
          </form>

          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary btn-big"
              disabled={!selectedPeople.length}
              onClick={() => setView('what')}
            >
              Next: the adventure →
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView('home')}>← Home</button>
          </div>
          {!selectedPeople.length && <p className="hint">Pick at least one adventurer.</p>}
        </main>
      )}

      {view === 'what' && (
        <main>
          <h2 className="screen-title">What kind of adventure?</h2>
          <ChipGroup title="Where to?" options={SETTINGS} value={picks.setting}
            onChange={(v) => setPicks((p) => ({ ...p, setting: v }))} />
          <ChipGroup title="How long have you got?" options={DURATIONS} value={picks.duration}
            onChange={(v) => setPicks((p) => ({ ...p, duration: v }))} />
          <ChipGroup title="How far will you roam?" options={DRIVES} value={picks.drive}
            onChange={(v) => setPicks((p) => ({ ...p, drive: v }))} />
          <ChipGroup title="Budget?" options={COST_PICKS} value={picks.cost}
            onChange={(v) => setPicks((p) => ({ ...p, cost: v }))} />
          <div className="btn-row">
            <button type="button" className="btn btn-primary btn-hero" onClick={buildAdventure}>
              🎲 Build my adventure
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView('who')}>← Who’s coming</button>
          </div>
          <p className="hint">
            Crew: {selectedPeople.map((p) => p.name).join(', ')} — {selectedPeople.length}{' '}
            {selectedPeople.length === 1 ? 'role' : 'roles'} will be assigned.
          </p>
        </main>
      )}

      {view === 'options' && cards && (
        <main>
          <h2 className="screen-title">Three ways today could go…</h2>
          <p className="hint">Pick one, or hit 🎲 on any card for a different one.</p>
          <OptionCard card={cards.A} onChoose={chooseCard} onReroll={doReroll} />
          <OptionCard card={cards.B} onChoose={chooseCard} onReroll={doReroll} />
          <OptionCard card={cards.C} onChoose={chooseCard} onReroll={doReroll} />
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setView('what')}>← Change the picks</button>
          </div>
        </main>
      )}

      {view === 'briefing' && briefing && (
        <main>
          <Briefing briefing={briefing} onStart={startMission} onBack={() => setView('options')} />
        </main>
      )}

      {view === 'live' && store.active && activeBriefing && (
        <main>
          <Live
            briefing={activeBriefing}
            checked={store.active.checked}
            onToggle={toggleHuntItem}
            onComplete={completeMission}
            onAbandon={() => setView('home')}
          />
        </main>
      )}

      {view === 'done' && (
        <main className="done-screen">
          <p className="done-emoji">🏆</p>
          <h2>Mission Complete!</h2>
          <p>
            Another one for the Adventure Log. Somewhere out there, a squirrel is telling the others about you.
          </p>
          <div className="btn-row center">
            {completed && (
              <button type="button" className="btn btn-primary btn-big" onClick={() => setView('storybook')}>
                📖 Make our storybook
              </button>
            )}
            <button type="button" className="btn btn-primary btn-big" onClick={() => setView('home')}>
            🏠 Back home
            </button>
            <button type="button" className="btn" onClick={() => setView('who')}>
              🧭 Plan another
            </button>
          </div>
        </main>
      )}

      {view === 'storybook' && completed && (
        <main>
          <StorybookFlow mission={completed} onClose={() => setView('done')} />
        </main>
      )}

      {view === 'storybooks' && (
        <main>
          <StorybookShelf onOpen={(book) => setReading(book)} />
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setView('home')}>← Home</button>
          </div>
        </main>
      )}

      {reading && (
        <StorybookReader book={reading} onClose={() => setReading(null)} />
      )}

      <footer className="app-footer">
        <p>Adventure Builder — build it at home, run it from your phone. Synced for the Harmon crew. 🧭</p>
        <p className="shs-credit">⌛ Built by <a href="https://stolenhourssoftware.github.io" target="_blank" rel="noreferrer">Stolen Hours Software</a> — built after bedtime.</p>
      </footer>
    </div>
  );
}
