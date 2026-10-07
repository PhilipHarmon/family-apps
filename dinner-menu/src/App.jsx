import { useEffect, useMemo, useRef, useState } from 'react';
import { SEED_RECIPES } from './data/recipes.js';
import { get, post, put, getFamilyKey, setFamilyKey } from './api.js';
import { isDemoMode } from './demoMode.js';
import FamilyKeyPrompt from './FamilyKeyPrompt.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* The API contract keys week days as mon..sun; the app keeps full day
 * names internally. Day VALUE shape is unchanged from the localStorage
 * days: { kind: 'recipe', recipeId } or { kind: 'custom', name, note }. */
const DAY_TO_API = {
  Monday: 'mon',
  Tuesday: 'tue',
  Wednesday: 'wed',
  Thursday: 'thu',
  Friday: 'fri',
  Saturday: 'sat',
  Sunday: 'sun',
};
const API_TO_DAY = Object.fromEntries(Object.entries(DAY_TO_API).map(([day, key]) => [key, day]));

function toApiDays(assignments) {
  const days = {};
  DAYS.forEach((day) => {
    if (assignments[day]) days[DAY_TO_API[day]] = assignments[day];
  });
  return days;
}

function fromApiDays(days) {
  const assignments = {};
  Object.entries(days || {}).forEach(([key, value]) => {
    if (API_TO_DAY[key] && value) assignments[API_TO_DAY[key]] = value;
  });
  return assignments;
}

/* Server recipes are {_id,name,time,ingredients[],steps[],tip,favorite,notes};
 * overlay local display metadata (emoji, tagline, tips) so the UI stays
 * the same. */
function mergeRecipe(apiRecipe) {
  const local = SEED_RECIPES.find((r) => r.id === apiRecipe._id);
  return {
    id: apiRecipe._id,
    _id: apiRecipe._id,
    name: apiRecipe.name,
    time: apiRecipe.time,
    emoji: (local && local.emoji) || '🍽️',
    tagline: (local && local.tagline) || '',
    ingredients: apiRecipe.ingredients || [],
    steps: apiRecipe.steps || [],
    tips: apiRecipe.tip ? [apiRecipe.tip] : ((local && local.tips) || []),
    favorite: !!apiRecipe.favorite,
    notes: apiRecipe.notes || '',
  };
}

/* ---------- star toggle (favorites) ---------- */
function StarButton({ favorite, onToggle }) {
  return (
    <button
      type="button"
      className={`star-btn${favorite ? ' active' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={!!favorite}
      title={favorite ? '★ Favorited — tap to remove' : '☆ Tap to favorite'}
    >
      {favorite ? '★' : '☆'}
    </button>
  );
}

/* ---------- modal ---------- */
function Modal({ title, sub, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {sub && <div className="meta">{sub}</div>}
        {children}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- full recipe view (favorites + notes) ---------- */
function RecipeModal({ recipe, onClose, onToggleFavorite, onSaveNotes }) {
  const [notesDraft, setNotesDraft] = useState(recipe.notes || '');
  const [notesState, setNotesState] = useState('idle'); // idle | saving | saved | error

  const saveNotes = async () => {
    setNotesState('saving');
    try {
      await onSaveNotes(recipe.id, notesDraft);
      setNotesState('saved');
      window.setTimeout(() => setNotesState((s) => (s === 'saved' ? 'idle' : s)), 2500);
    } catch {
      setNotesState('error');
    }
  };

  return (
    <Modal title={`${recipe.emoji} ${recipe.name}`} sub={recipe.time} onClose={onClose}>
      <div className="favorite-row">
        <StarButton favorite={recipe.favorite} onToggle={() => onToggleFavorite(recipe.id)} />
        <span className="favorite-label">
          {recipe.favorite ? '★ A house favorite' : 'Tap the star to make this a house favorite'}
        </span>
      </div>
      <h4>Ingredients</h4>
      <ul className="ingredients-list">
        {recipe.ingredients.map((ing) => (
          <li key={ing}>{ing}</li>
        ))}
      </ul>
      <h4>Instructions</h4>
      <ol className="steps-list">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      {recipe.tips && recipe.tips.length > 0 && (
        <>
          <h4>Tips</h4>
          {recipe.tips.map((tip, i) => (
            <div className="tip-box" key={i}>
              💡 {tip}
            </div>
          ))}
        </>
      )}
      <h4>📝 Our notes</h4>
      {recipe.notes ? (
        <div className="notes-display">{recipe.notes}</div>
      ) : (
        <p className="empty-state" style={{ margin: '0 0 0.5rem' }}>
          No notes yet — jot down tweaks for next time below.
        </p>
      )}
      <div className="field">
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Changes we'd make next time…"
          aria-label="Recipe notes"
        />
      </div>
      <div className="notes-actions">
        <button
          className="btn btn-primary btn-small"
          onClick={saveNotes}
          disabled={notesState === 'saving'}
        >
          {notesState === 'saving' ? 'Saving…' : 'Save notes'}
        </button>
        {notesState === 'saved' && <span className="notes-saved">✓ Saved</span>}
        {notesState === 'error' && <span className="notes-error">Couldn't save — try again.</span>}
      </div>
    </Modal>
  );
}

/* ---------- assign-a-meal modal ---------- */
function AssignModal({ day, recipes, onAssign, onClose }) {
  const [tab, setTab] = useState('library');
  const [quickName, setQuickName] = useState('');
  const [quickNote, setQuickNote] = useState('');

  const pick = (recipeId) => {
    onAssign({ kind: 'recipe', recipeId });
    onClose();
  };

  const addQuick = () => {
    const name = quickName.trim();
    if (!name) return;
    onAssign({ kind: 'custom', name, note: quickNote.trim() });
    onClose();
  };

  return (
    <Modal title={`What's for dinner, ${day}?`} sub="Pick something delicious." onClose={onClose}>
      <div className="tabs" style={{ padding: '0 0 1rem' }}>
        {[
          ['library', '🍳 Library'],
          ['quick', '✍️ Quick meal'],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'library' && (
        <div>
          {recipes.length === 0 && (
            <p className="empty-state">No recipes on the server yet — the kitchen is quiet.</p>
          )}
          {recipes.map((r) => (
            <div className="custom-row" key={r.id}>
              <div>
                <div className="name">
                  {r.emoji} {r.name}
                </div>
                <div className="note">{r.time}</div>
              </div>
              <button className="btn btn-primary btn-small" onClick={() => pick(r.id)}>
                Pick
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'quick' && (
        <div>
          <div className="field">
            <label>Meal name</label>
            <input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="e.g. Leftover pizza night"
            />
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="e.g. Pepper wants extra cheese"
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={addQuick} disabled={!quickName.trim()}>
              Add to {day}
            </button>
          </div>
          <p className="empty-state" style={{ marginTop: '0.75rem' }}>
            Just for this week — a one-off, not a saved favorite.
          </p>
        </div>
      )}
    </Modal>
  );
}

/* ---------- rename a custom assignment ---------- */
function RenameModal({ day, assignment, onSave, onClose }) {
  const [name, setName] = useState(assignment.name || '');
  const [note, setNote] = useState(assignment.note || '');

  const save = () => {
    if (!name.trim()) return;
    onSave({ ...assignment, name: name.trim(), note: note.trim() });
    onClose();
  };

  return (
    <Modal title={`Rename ${day}'s dinner`} onClose={onClose}>
      <div className="field">
        <label>Meal name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>
          Save
        </button>
      </div>
    </Modal>
  );
}

/* ---------- import a week from Fred's Sunday menu JSON ---------- */
function ImportModal({ onClose, onImport }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const runImport = async () => {
    setError('');
    setResult('');
    if (!text.trim()) {
      setError("Paste the JSON block from Fred's Sunday menu message first.");
      return;
    }
    setBusy(true);
    try {
      const summary = await onImport(text);
      setResult(summary);
    } catch (err) {
      setError(err && err.message ? err.message : 'Something went wrong during import.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="📥 Import week"
      sub="Paste the JSON block from Fred's Sunday menu message."
      onClose={onClose}
    >
      <div className="field">
        <label>Menu JSON</label>
        <textarea
          className="import-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'{"recipes": [...], "week": {"sun": "...", "mon": "..."}}'}
          spellCheck={false}
          aria-label="Menu JSON to import"
        />
      </div>
      {error && <div className="import-error">{error}</div>}
      {result && <div className="import-result">✓ {result}</div>}
      <div className="notes-actions">
        <button className="btn btn-primary" onClick={runImport} disabled={busy}>
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>
      <p className="empty-state" style={{ marginTop: '0.5rem' }}>
        Recipes that match your library by name are reused; new ones are added.
        Names that don't match become one-off custom meals.
      </p>
    </Modal>
  );
}

/* ---------- main app ---------- */
export default function App() {
  const demoMode = isDemoMode();
  const [familyKey, setFamilyKeyState] = useState(() => getFamilyKey());
  const [promptError, setPromptError] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [loadNonce, setLoadNonce] = useState(0);

  const [view, setView] = useState('week');
  const [recipes, setRecipes] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [weekLoaded, setWeekLoaded] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | error
  const [saveAttempt, setSaveAttempt] = useState(0);

  const [assignDay, setAssignDay] = useState(null);
  const [recipeModalId, setRecipeModalId] = useState(null);
  const [renameDay, setRenameDay] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const assignmentsRef = useRef(assignments);
  assignmentsRef.current = assignments;
  const saveQueue = useRef(Promise.resolve());

  const handleUnauthorized = () => {
    setFamilyKeyState('');
    setPromptError('That family key didn\u2019t work — please enter it again.');
    setWeekLoaded(false);
    setStatus('loading');
  };

  const saveKey = (key) => {
    setFamilyKey(key);
    setPromptError('');
    setFamilyKeyState(key);
  };

  /* ----- initial load: recipes (auto-seed if empty) + week plan ----- */
  useEffect(() => {
    if (!familyKey && !demoMode) return;
    let cancelled = false;
    setStatus('loading');
    setLoadError('');
    (async () => {
      try {
        let list = await get('/recipes');
        if (Array.isArray(list) && list.length === 0) {
          await post('/recipes/seed');
          list = await get('/recipes');
        }
        const week = await get('/week');
        if (cancelled) return;
        setRecipes((list || []).map(mergeRecipe));
        setAssignments(fromApiDays(week && week.days));
        setWeekLoaded(true);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        if (err && err.unauthorized) {
          handleUnauthorized();
          return;
        }
        setLoadError(err && err.message ? err.message : 'Something went wrong while loading.');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyKey, loadNonce]);

  /* ----- persist the week on change: debounced, writes serialized ----- */
  useEffect(() => {
    if (!weekLoaded) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      const snapshot = assignmentsRef.current;
      saveQueue.current = saveQueue.current
        .then(() => put('/week', { days: toApiDays(snapshot) }))
        .then(() => setSaveState('idle'))
        .catch((err) => {
          if (err && err.unauthorized) {
            handleUnauthorized();
            return;
          }
          setSaveState('error');
        });
    }, 700);
    return () => clearTimeout(t);
  }, [assignments, weekLoaded, saveAttempt]);

  const recipeById = (id) => recipes.find((r) => r.id === id);
  const recipeModal = recipeModalId ? recipeById(recipeModalId) : null;

  /* Favorites float to the top of the library, then alphabetical. */
  const sortedRecipes = useMemo(
    () =>
      [...recipes].sort(
        (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || a.name.localeCompare(b.name)
      ),
    [recipes]
  );

  const toggleFavorite = async (id) => {
    const recipe = recipeById(id);
    if (!recipe) return;
    const next = !recipe.favorite;
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, favorite: next } : r)));
    try {
      const updated = await put(`/recipes/${id}`, { favorite: next });
      setRecipes((rs) => rs.map((r) => (r.id === id ? mergeRecipe(updated) : r)));
    } catch (err) {
      if (err && err.unauthorized) {
        handleUnauthorized();
        return;
      }
      setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, favorite: !next } : r)));
    }
  };

  const saveRecipeNotes = async (id, notes) => {
    try {
      const updated = await put(`/recipes/${id}`, { notes });
      setRecipes((rs) => rs.map((r) => (r.id === id ? mergeRecipe(updated) : r)));
    } catch (err) {
      if (err && err.unauthorized) handleUnauthorized();
      throw err;
    }
  };

  /* ----- import a week from Fred's Sunday menu JSON ----- */
  const importWeekData = async (text) => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        "That doesn't look like valid JSON — paste the whole block from Fred's message, braces and all."
      );
    }
    const incoming = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const incomingWeek = parsed.week && typeof parsed.week === 'object' ? parsed.week : {};

    try {
      const norm = (s) => String(s || '').trim().toLowerCase();
      const byName = new Map();
      recipes.forEach((r) => {
        const key = norm(r.name);
        if (key && !byName.has(key)) byName.set(key, r);
      });

      let added = 0;
      let matched = 0;
      for (const rec of incoming) {
        if (!rec || !rec.name || !String(rec.name).trim()) continue;
        const key = norm(rec.name);
        const existing = byName.get(key);
        if (existing) {
          matched += 1;
          continue;
        }
        const created = await post('/recipes', {
          name: String(rec.name).trim(),
          time: rec.time || '',
          ingredients: Array.isArray(rec.ingredients) ? rec.ingredients : [],
          steps: Array.isArray(rec.steps) ? rec.steps : [],
          tip: rec.tip || '',
        });
        const merged = mergeRecipe(created);
        byName.set(key, merged);
        added += 1;
        setRecipes((rs) => [...rs, merged]);
      }

      const WEEK_IMPORT_MAP = {
        sun: 'Sunday',
        mon: 'Monday',
        tue: 'Tuesday',
        wed: 'Wednesday',
        thu: 'Thursday',
        fri: 'Friday',
        sat: 'Saturday',
      };
      const next = { ...assignmentsRef.current };
      let planned = 0;
      Object.entries(WEEK_IMPORT_MAP).forEach(([wk, dayName]) => {
        const name = incomingWeek[wk];
        if (!name || !String(name).trim()) return;
        const recipe = byName.get(norm(name));
        next[dayName] = recipe
          ? { kind: 'recipe', recipeId: recipe.id }
          : { kind: 'custom', name: String(name).trim(), note: '' };
        planned += 1;
      });

      setAssignments(next);
      await put('/week', { days: toApiDays(next) });

      const bits = [];
      if (added) bits.push(`${added} new recipe${added === 1 ? '' : 's'} added`);
      if (matched) bits.push(`${matched} matched your library`);
      bits.push(`week plan set (${planned} of 7 days)`);
      return bits.join(' · ') + '.';
    } catch (err) {
      if (err && err.unauthorized) handleUnauthorized();
      throw err;
    }
  };

  const assignMeal = (day, assignment) => setAssignments((a) => ({ ...a, [day]: assignment }));
  const removeMeal = (day) =>
    setAssignments((a) => {
      const next = { ...a };
      delete next[day];
      return next;
    });
  const clearWeek = () => {
    if (window.confirm('Clear the whole week? This wipes all 7 days.')) setAssignments({});
  };

  const plannedCount = DAYS.filter((d) => assignments[d]).length;

  /* ----- grocery list: dedupe ingredients across planned recipe meals ----- */
  const grocery = useMemo(() => {
    const map = new Map();
    DAYS.forEach((day) => {
      const a = assignments[day];
      if (!a || a.kind !== 'recipe') return;
      const recipe = recipeById(a.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach((ing) => {
        const norm = ing
          .toLowerCase()
          .replace(/\([^)]*\)/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!map.has(norm)) map.set(norm, { display: ing, meals: [] });
        map.get(norm).meals.push(recipe.name);
      });
    });
    return [...map.values()].sort((x, y) => x.display.localeCompare(y.display));
  }, [assignments, recipes]);

  const groceryMeals = DAYS.filter((d) => assignments[d]?.kind === 'recipe')
    .map((d) => recipeById(assignments[d].recipeId)?.name)
    .filter(Boolean);

  const mealLabel = (a) => {
    if (!a) return null;
    if (a.kind === 'recipe') {
      const r = recipeById(a.recipeId);
      return r ? `${r.emoji} ${r.name}` : 'Unknown recipe';
    }
    return a.name;
  };

  /* ---------- key prompt / loading / error screens ---------- */
  if (!familyKey && !demoMode) {
    return <FamilyKeyPrompt error={promptError} onSave={saveKey} />;
  }

  const demoBanner = demoMode ? (
    <div
      style={{
        background: 'linear-gradient(90deg, #f6d186, #f0a868)',
        color: '#5a3a1a',
        padding: '0.5rem 1rem',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <span role="img" aria-label="demo">
        🍳
      </span>
      <span>
        <strong>Demo preview</strong> — sample data, saved in this browser only.
      </span>
      <button
        className="btn btn-ghost btn-small"
        style={{ borderColor: '#5a3a1a', color: '#5a3a1a' }}
        onClick={() => {
          localStorage.removeItem('demoData:dinner-menu');
          window.location.reload();
        }}
      >
        Reset demo
      </button>
    </div>
  ) : null;

  if (status === 'loading') {
    return (
      <>
        {demoBanner}
        <div className="center-screen">
        <div className="center-card">
          <h1>🍳 Warming up the kitchen…</h1>
          <p>Fetching this week's dinners from the family server.</p>
        </div>
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {demoBanner}
        <div className="center-screen">
        <div className="center-card">
          <h1>😞 Couldn't reach the family server</h1>
          <p>{loadError}</p>
          <button className="btn btn-primary" onClick={() => setLoadNonce((n) => n + 1)}>
            Retry
          </button>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {demoBanner}
      <header className="header">
        <h1>🍽️ What's for Dinner?</h1>
        <p>Your friendly weekly dinner planner — no more 6 PM panic.</p>
      </header>

      <nav className="tabs">
        {[
          ['week', '📅 This Week'],
          ['recipes', '🍳 Recipes'],
          ['grocery', '🛒 Grocery List'],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main>
        {/* ================= WEEK ================= */}
        {view === 'week' && (
          <>
            <div className="week-toolbar">
              <h2>This week's game plan</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {saveState === 'saving' && <span className="save-hint">Saving…</span>}
                {saveState === 'error' && (
                  <span className="save-error">
                    Couldn't save.{' '}
                    <button className="btn btn-ghost btn-small" onClick={() => setSaveAttempt((n) => n + 1)}>
                      Retry
                    </button>
                  </span>
                )}
                <span className="recipe-time" style={{ alignSelf: 'center' }}>
                  {plannedCount} of 7 planned
                </span>
                <button className="btn btn-ghost btn-small" onClick={() => setImportOpen(true)}>
                  📥 Import week
                </button>
                {plannedCount > 0 && (
                  <button className="btn btn-danger-ghost btn-small" onClick={clearWeek}>
                    Clear week
                  </button>
                )}
              </div>
            </div>
            <div className="week-grid">
              {DAYS.map((day) => {
                const a = assignments[day];
                return (
                  <div className="day-card" key={day}>
                    <h3>{day}</h3>
                    {a ? (
                      <>
                        {a.kind === 'recipe' ? (
                          <button
                            className="btn btn-ghost btn-small meal-name"
                            style={{ textAlign: 'left', border: 'none', padding: 0, fontWeight: 700 }}
                            onClick={() => setRecipeModalId(a.recipeId)}
                            title="View recipe"
                          >
                            {mealLabel(a)} 📖
                          </button>
                        ) : (
                          <>
                            <div className="meal-name">{a.name}</div>
                            {a.note && <div className="meal-note">{a.note}</div>}
                          </>
                        )}
                        <div className="day-actions">
                          <button className="btn btn-ghost btn-small" onClick={() => setAssignDay(day)}>
                            Change
                          </button>
                          {a.kind === 'custom' && (
                            <button className="btn btn-ghost btn-small" onClick={() => setRenameDay(day)}>
                              Rename
                            </button>
                          )}
                          <button className="btn btn-danger-ghost btn-small" onClick={() => removeMeal(day)}>
                            Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="empty-state">Nothing planned yet… the fridge awaits.</div>
                        <div className="day-actions">
                          <button className="btn btn-primary btn-small" onClick={() => setAssignDay(day)}>
                            Pick a meal
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================= RECIPES ================= */}
        {view === 'recipes' && (
          <>
            <div className="section-head">
              <h2>House favorites</h2>
              <span className="recipe-time">★ favorites float to the top</span>
            </div>
            {sortedRecipes.length === 0 ? (
              <p className="empty-state">No recipes on the server yet — the kitchen is quiet.</p>
            ) : (
              <div className="recipe-grid">
                {sortedRecipes.map((r) => (
                  <div className="recipe-card" key={r.id} onClick={() => setRecipeModalId(r.id)}>
                    <StarButton favorite={r.favorite} onToggle={() => toggleFavorite(r.id)} />
                    <div className="emoji">{r.emoji}</div>
                    <h3>{r.name}</h3>
                    <span className="recipe-time">{r.time}</span>
                    {r.tagline && <p className="recipe-tagline">{r.tagline}</p>}
                    <div className="view-hint">Tap for the full recipe →</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= GROCERY ================= */}
        {view === 'grocery' && (
          <div className="grocery-wrap">
            <h2>🛒 Grocery List</h2>
            <div className="grocery-meta">
              {groceryMeals.length > 0 ? (
                <>
                  Built from this week's planned meals: <strong>{groceryMeals.join(' · ')}</strong>
                  <br />
                  <span className="grocery-count">{grocery.length}</span> item
                  {grocery.length === 1 ? '' : 's'} to grab.
                </>
              ) : (
                'Plan some meals first, and your shopping list will assemble itself here like magic.'
              )}
            </div>
            {grocery.length === 0 ? (
              <p className="empty-grocery">
                Your list is empty — head to <strong>This Week</strong> and pick a few dinners.
              </p>
            ) : (
              <>
                <ul className="grocery-list">
                  {grocery.map((item) => (
                    <li key={item.display}>
                      {item.display}
                      {item.meals.length > 1 && (
                        <span style={{ color: 'var(--muted)', fontSize: '0.85em' }}>
                          {' '}
                          (×{item.meals.length})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="print-btn-row">
                  <button className="btn btn-primary" onClick={() => window.print()}>
                    🖨️ Print list
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ================= modals ================= */}
      {assignDay && (
        <AssignModal
          day={assignDay}
          recipes={sortedRecipes}
          onAssign={(a) => assignMeal(assignDay, a)}
          onClose={() => setAssignDay(null)}
        />
      )}
      {recipeModal && (
        <RecipeModal
          key={recipeModal.id}
          recipe={recipeModal}
          onClose={() => setRecipeModalId(null)}
          onToggleFavorite={toggleFavorite}
          onSaveNotes={saveRecipeNotes}
        />
      )}
      {renameDay && assignments[renameDay] && (
        <RenameModal
          day={renameDay}
          assignment={assignments[renameDay]}
          onSave={(a) => assignMeal(renameDay, a)}
          onClose={() => setRenameDay(null)}
        />
      )}
      {importOpen && (
        <ImportModal onClose={() => setImportOpen(false)} onImport={importWeekData} />
      )}
    </>
  );
}
