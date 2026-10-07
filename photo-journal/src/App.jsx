import { useState, useEffect, useCallback } from 'react'
import { api, getFamilyKey, FAMILY_KEY_STORAGE } from './api.js'
import FamilyKeyPrompt from './FamilyKeyPrompt.jsx'
import { isDemoMode } from './demoMode.js'

// ---------- date helpers ----------
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const prettyDate = (key) =>
  parseKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

const shortDate = (d) =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

const shiftDays = (d, n) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

// ---------- seed data (PLACEHOLDERS — stock picsum photos, not real family photos) ----------
// Posted to the shared API on first load only, when the journal is empty.
const SEED_ENTRIES = [
  {
    offset: 0,
    url: 'https://picsum.photos/seed/porch/600/400',
    caption: 'Golden hour on the porch — everyone home, nowhere to be.',
  },
  {
    offset: -1,
    url: 'https://picsum.photos/seed/sunset/600/400',
    caption: 'Chased the sunset and caught it just in time.',
  },
  {
    offset: -2,
    url: 'https://picsum.photos/seed/dog/600/400',
    caption: 'Someone was very proud of absolutely nothing today.',
  },
]

// Server entries look like {_id, date, imageUrl, caption}.
// Client-side we index by date: { [date]: { url, caption, _id } }
function indexByDate(list) {
  const out = {}
  list.forEach((item) => {
    out[item.date] = { url: item.imageUrl, caption: item.caption, _id: item._id }
  })
  return out
}

// ---------- streak ----------
function streakOf(entries) {
  let count = 0
  let d = new Date()
  if (!entries[dayKey(d)]) d = shiftDays(d, -1)
  while (entries[dayKey(d)]) {
    count += 1
    d = shiftDays(d, -1)
  }
  return count
}

function streakCopy(n) {
  if (n === 0) return { title: 'No streak yet — the camera misses you!', sub: "Add today's photo to start your first streak." }
  if (n === 1) return { title: '1-day streak! The journey of a thousand photos begins with one.', sub: 'Come back tomorrow to keep it alive.' }
  if (n < 7) return { title: `${n}-day streak! You're on a roll — the fridge is jealous.`, sub: 'Keep it going tomorrow!' }
  if (n < 30) return { title: `${n}-day streak! Officially unstoppable.`, sub: 'Your future self says thanks.' }
  return { title: `${n}-day streak! A bona fide family institution.`, sub: 'Frame one of these already.' }
}

// ---------- app ----------
export default function App() {
  const demoMode = isDemoMode()
  const [familyKey, setFamilyKey] = useState(() => getFamilyKey())
  const [keyRejected, setKeyRejected] = useState(false)
  const [entries, setEntries] = useState(null) // null = not loaded yet
  const [loadState, setLoadState] = useState(familyKey ? 'loading' : 'idle') // 'idle' | 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [view, setView] = useState('calendar') // 'calendar' | 'feed'
  const [calCursor, setCalCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [editing, setEditing] = useState(null) // dayKey being edited, or null

  const handleUnauthorized = useCallback(() => {
    setKeyRejected(true)
    setFamilyKey('')
    setEntries(null)
    setLoadState('idle')
    setEditing(null)
  }, [])

  const loadData = useCallback(
    async (key) => {
      setLoadState('loading')
      setLoadError(null)
      try {
        let list = await api.list(key)
        if (list.length === 0) {
          // First load ever: migrate the 3 placeholder seeds into the shared API.
          const today = new Date()
          for (const s of SEED_ENTRIES) {
            await api.create(key, {
              date: dayKey(shiftDays(today, s.offset)),
              imageUrl: s.url,
              caption: s.caption,
            })
          }
          list = await api.list(key)
        }
        setEntries(indexByDate(list))
        setLoadState('ready')
      } catch (err) {
        if (err.unauthorized) {
          handleUnauthorized()
          return
        }
        setLoadError(err.message || 'Something went wrong while loading the journal.')
        setLoadState('error')
      }
    },
    [handleUnauthorized]
  )

  useEffect(() => {
    if (familyKey || demoMode) loadData(familyKey)
  }, [familyKey, demoMode, loadData])

  const handleKeySave = (key) => {
    try {
      localStorage.setItem(FAMILY_KEY_STORAGE, key)
    } catch {
      // storage unavailable — key lives in memory for this session
    }
    setKeyRejected(false)
    setFamilyKey(key)
  }

  const saveEntry = async (key, entry) => {
    setActionError(null)
    const existing = entries[key]
    const payload = { date: key, imageUrl: entry.url, caption: entry.caption }
    try {
      const saved = existing?._id
        ? await api.update(familyKey, existing._id, payload)
        : await api.create(familyKey, payload)
      setEntries((prev) => ({
        ...prev,
        [key]: { url: saved.imageUrl ?? entry.url, caption: saved.caption ?? entry.caption, _id: saved._id },
      }))
      setEditing(null)
    } catch (err) {
      if (err.unauthorized) {
        handleUnauthorized()
        return
      }
      setActionError(err.message || 'Couldn\'t save that entry — give it another go.')
    }
  }

  const deleteEntry = async (key) => {
    setActionError(null)
    const existing = entries[key]
    try {
      if (existing?._id) await api.remove(familyKey, existing._id)
      setEntries((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setEditing(null)
    } catch (err) {
      if (err.unauthorized) {
        handleUnauthorized()
        return
      }
      setActionError(err.message || 'Couldn\'t delete that entry — give it another go.')
    }
  }

  const ready = loadState === 'ready' && entries
  const streak = ready ? streakOf(entries) : 0
  const copy = streakCopy(streak)
  const sortedKeys = ready ? Object.keys(entries).sort((a, b) => (a < b ? 1 : -1)) : []

  return (
    <div className="app">
      {demoMode && (
        <div
          style={{
            background: '#f3ede1',
            borderBottom: '1px solid #e5dcc9',
            color: '#3d2f26',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <span>📸 Demo preview — sample data, saved in this browser only.</span>
          <button
            onClick={() => { localStorage.removeItem('demoData:photo-journal'); window.location.reload(); }}
            style={{
              background: '#a8512f',
              color: '#fffdf9',
              border: 'none',
              borderRadius: '999px',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Reset demo
          </button>
        </div>
      )}

      {!familyKey && !demoMode && (
        <FamilyKeyPrompt
          onSave={handleKeySave}
          rejectedNote={keyRejected ? 'The last key didn\'t work — double-check it and try again.' : null}
        />
      )}

      <header className="header">
        <h1>One Day, One Photo</h1>
        <p className="tagline">a little family journal, one snapshot at a time</p>
        {ready && (
          <div className="streak-banner">
            <div className="streak-flame" aria-hidden>🔥</div>
            <div className="streak-text">
              <strong>{copy.title}</strong>
              <span>{copy.sub}</span>
            </div>
          </div>
        )}
      </header>

      {actionError && (
        <p className="action-error">
          {actionError} <button onClick={() => setActionError(null)}>Dismiss</button>
        </p>
      )}

      {(familyKey || demoMode) && loadState === 'loading' && (
        <div className="empty-state">
          <div className="big">📷</div>
          <h3>Gathering everyone&apos;s snapshots…</h3>
          <p>Pulling the family journal in — one moment.</p>
        </div>
      )}

      {(familyKey || demoMode) && loadState === 'error' && (
        <div className="empty-state">
          <div className="big">📡</div>
          <h3>Hmm, the journal wouldn&apos;t load</h3>
          <p>{loadError}</p>
          <div className="modal-actions" style={{ maxWidth: 280, margin: '20px auto 0' }}>
            <button className="btn btn-primary" onClick={() => loadData(familyKey)}>
              🔁 Retry
            </button>
          </div>
        </div>
      )}

      {ready && (
        <>
          <nav className="tabs">
            <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
              📅 Calendar
            </button>
            <button className={view === 'feed' ? 'active' : ''} onClick={() => setView('feed')}>
              📖 Story so far
            </button>
          </nav>

          {view === 'calendar' ? (
            <Calendar
              entries={entries}
              cursor={calCursor}
              setCursor={setCalCursor}
              onPickDay={setEditing}
            />
          ) : (
            <Feed entries={entries} sortedKeys={sortedKeys} onEdit={setEditing} onDelete={deleteEntry} />
          )}
        </>
      )}

      {ready && editing && (
        <EntryModal
          dayKeyValue={editing}
          existing={entries[editing]}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setEditing(null)}
        />
      )}

      <footer className="footer">
        Made with love, one day at a time. 💛
      </footer>
    </div>
  )
}

// ---------- calendar ----------
function Calendar({ entries, cursor, setCursor, onPickDay }) {
  const { year, month } = cursor
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = first.getDay()
  const todayK = dayKey(new Date())

  const cells = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <section className="cal-card">
      <div className="cal-nav">
        <button
          aria-label="Previous month"
          onClick={() =>
            setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
          }
        >
          ‹
        </button>
        <h2>{shortDate(first)}</h2>
        <button
          aria-label="Next month"
          onClick={() =>
            setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
          }
        >
          ›
        </button>
      </div>
      <div className="cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {cells.map((date, i) =>
          date === null ? (
            <div key={`e${i}`} className="cal-day empty" />
          ) : (
            <DayCell key={dayKey(date)} date={date} entry={entries[dayKey(date)]} isToday={dayKey(date) === todayK} onPick={() => onPickDay(dayKey(date))} />
          )
        )}
      </div>
      <p className="cal-hint">Tap any day to add or edit its photo. Days with memories wear thumbnails.</p>
    </section>
  )
}

function DayCell({ date, entry, isToday, onPick }) {
  const cls = `cal-day${isToday ? ' today' : ''}`
  return (
    <button className={cls} onClick={onPick} aria-label={prettyDate(dayKey(date))}>
      {entry && <img className="thumb" src={entry.url} alt="" loading="lazy" />}
      <span className={`num${entry ? ' on-photo' : ''}`}>{date.getDate()}</span>
    </button>
  )
}

// ---------- feed ----------
function Feed({ entries, sortedKeys, onEdit, onDelete }) {
  if (sortedKeys.length === 0) {
    return (
      <div className="empty-state">
        <div className="big">📸</div>
        <h3>No snapshots yet!</h3>
        <p>
          Every great family story starts somewhere — usually with a blurry photo and a caption
          that makes everyone laugh. Hop over to the calendar and pick a day to begin.
        </p>
      </div>
    )
  }
  return (
    <section className="feed">
      {sortedKeys.map((key) => (
        <article key={key} className="feed-card">
          <img src={entries[key].url} alt={entries[key].caption} loading="lazy" />
          <div className="feed-body">
            <div className="feed-date">{prettyDate(key)}</div>
            <p className="feed-caption">{entries[key].caption}</p>
            <div className="feed-actions">
              <button onClick={() => onEdit(key)}>✏️ Edit</button>
              <button className="danger" onClick={() => { if (window.confirm("Toss this memory? It'll be gone for good.")) onDelete(key) }}>
                🗑 Delete
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

// ---------- entry modal ----------
function EntryModal({ dayKeyValue, existing, onSave, onDelete, onClose }) {
  const [url, setUrl] = useState(existing?.url ?? '')
  const [caption, setCaption] = useState(existing?.caption ?? '')
  const [imgOk, setImgOk] = useState(true)

  const canSave = url.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave(dayKeyValue, { url: url.trim(), caption: caption.trim() || 'A day worth remembering. 📷' })
  }

  const handleDelete = () => {
    if (window.confirm("Toss this memory? It'll be gone for good.")) onDelete(dayKeyValue)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{existing ? 'Touch up this memory' : 'Capture this day'}</h2>
        <p className="modal-sub">{prettyDate(dayKeyValue)} — one photo, one line. That&apos;s the whole job.</p>

        <div className="field">
          <label htmlFor="photo-url">Photo URL</label>
          <input
            id="photo-url"
            type="url"
            placeholder="https://… paste an image link here"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setImgOk(true) }}
          />
        </div>

        <div className="preview">
          {url.trim() && imgOk ? (
            <img src={url.trim()} alt="preview" onError={() => setImgOk(false)} />
          ) : (
            <span>{url.trim() ? "Hmm, that link didn't load a photo — double-check it?" : 'Your photo preview will appear here ✨'}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="photo-caption">One-line caption</label>
          <textarea
            id="photo-caption"
            rows={2}
            maxLength={140}
            placeholder="What made today today?"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave} style={{ opacity: canSave ? 1 : 0.5 }}>
            💾 {existing ? 'Save changes' : 'Save this day'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {existing && (
            <button className="btn btn-danger" onClick={handleDelete}>🗑 Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}
