import { useState, useEffect, useCallback, useRef } from 'react'
import { api, getFamilyKey, FAMILY_KEY_STORAGE } from './api.js'
import FamilyKeyPrompt from './FamilyKeyPrompt.jsx'
import { isDemoMode } from './demoMode.js'
import { cloudinaryConfigured, uploadFile, friendlySize, MAX_UPLOAD_BYTES } from './cloudinary.js'

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

// Server entries look like {_id, date, imageUrl, caption, mediaType}.
// Client-side we group by date: { [date]: [{ url, caption, _id, mediaType }] }
// (oldest first within a day). Docs without mediaType read as images.
function indexByDate(list) {
  const out = {}
  list.forEach((item) => {
    const entry = {
      url: item.imageUrl,
      caption: item.caption,
      _id: item._id,
      mediaType: item.mediaType === 'video' ? 'video' : 'image',
    }
    if (!out[item.date]) out[item.date] = []
    out[item.date].push(entry)
  })
  // Server sorts newest-first; flip each day so galleries read oldest → newest.
  Object.keys(out).forEach((k) => out[k].reverse())
  return out
}

const hasItems = (entries, key) => Array.isArray(entries[key]) && entries[key].length > 0

// ---------- streak ----------
function streakOf(entries) {
  let count = 0
  let d = new Date()
  if (!hasItems(entries, dayKey(d))) d = shiftDays(d, -1)
  while (hasItems(entries, dayKey(d))) {
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

const DEFAULT_CAPTION = 'A day worth remembering. 📷'

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
  const [editing, setEditing] = useState(null) // dayKey being viewed/edited, or null

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
              mediaType: 'image',
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

  // Append one or more items to a day.
  const addItems = async (key, items) => {
    setActionError(null)
    try {
      const saved = []
      for (const item of items) {
        const doc = await api.create(familyKey, {
          date: key,
          imageUrl: item.url,
          caption: item.caption?.trim() || DEFAULT_CAPTION,
          mediaType: item.mediaType === 'video' ? 'video' : 'image',
        })
        saved.push({
          url: doc.imageUrl ?? item.url,
          caption: doc.caption ?? item.caption,
          _id: doc._id,
          mediaType: doc.mediaType === 'video' ? 'video' : 'image',
        })
      }
      setEntries((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), ...saved],
      }))
    } catch (err) {
      if (err.unauthorized) {
        handleUnauthorized()
        return
      }
      setActionError(err.message || "Couldn't save those memories — give it another go.")
      throw err
    }
  }

  const updateItemCaption = async (key, itemId, caption) => {
    setActionError(null)
    const item = (entries[key] || []).find((i) => i._id === itemId)
    if (!item) return
    try {
      const saved = await api.update(familyKey, itemId, {
        date: key,
        imageUrl: item.url,
        caption: caption.trim() || DEFAULT_CAPTION,
        mediaType: item.mediaType,
      })
      setEntries((prev) => ({
        ...prev,
        [key]: (prev[key] || []).map((i) =>
          i._id === itemId ? { ...i, caption: saved.caption ?? caption } : i
        ),
      }))
    } catch (err) {
      if (err.unauthorized) {
        handleUnauthorized()
        return
      }
      setActionError(err.message || "Couldn't save that caption — give it another go.")
    }
  }

  const deleteItem = async (key, itemId) => {
    setActionError(null)
    try {
      await api.remove(familyKey, itemId)
      setEntries((prev) => {
        const next = { ...prev }
        next[key] = (next[key] || []).filter((i) => i._id !== itemId)
        if (next[key].length === 0) delete next[key]
        return next
      })
    } catch (err) {
      if (err.unauthorized) {
        handleUnauthorized()
        return
      }
      setActionError(err.message || "Couldn't delete that memory — give it another go.")
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
        <h1>One Day, Many Memories</h1>
        <p className="tagline">a little family journal — photos and videos, one day at a time</p>
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
            <Feed entries={entries} sortedKeys={sortedKeys} onEdit={setEditing} onUpdateItem={updateItemCaption} onDeleteItem={deleteItem} />
          )}
        </>
      )}

      {ready && editing && (
        <DayModal
          dayKeyValue={editing}
          items={entries[editing] || []}
          onAddItems={(items) => addItems(editing, items)}
          onUpdateItem={(itemId, caption) => updateItemCaption(editing, itemId, caption)}
          onDeleteItem={(itemId) => deleteItem(editing, itemId)}
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
            <DayCell key={dayKey(date)} date={date} items={entries[dayKey(date)]} isToday={dayKey(date) === todayK} onPick={() => onPickDay(dayKey(date))} />
          )
        )}
      </div>
      <p className="cal-hint">Tap any day to add photos or videos. Days with memories wear thumbnails.</p>
    </section>
  )
}

function DayCell({ date, items, isToday, onPick }) {
  const first = items && items[0]
  const cls = `cal-day${isToday ? ' today' : ''}`
  return (
    <button className={cls} onClick={onPick} aria-label={prettyDate(dayKey(date))}>
      {first && first.mediaType === 'image' && (
        <img className="thumb" src={first.url} alt="" loading="lazy" />
      )}
      {first && first.mediaType === 'video' && (
        <span className="thumb thumb-video" aria-hidden>▶</span>
      )}
      {items && items.length > 1 && <span className="thumb-count">+{items.length - 1}</span>}
      <span className={`num${first ? ' on-photo' : ''}`}>{date.getDate()}</span>
    </button>
  )
}

// ---------- feed ----------
function Feed({ entries, sortedKeys, onEdit, onUpdateItem, onDeleteItem }) {
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
          <div className="feed-date-row">
            <div className="feed-date">{prettyDate(key)}</div>
            <button className="feed-add" onClick={() => onEdit(key)}>＋ Add</button>
          </div>
          <div className="feed-gallery">
            {entries[key].map((item) => (
              <GalleryItem
                key={item._id}
                item={item}
                onUpdateCaption={(caption) => onUpdateItem(key, item._id, caption)}
                onDelete={() => {
                  if (window.confirm("Toss this memory? It'll be gone for good.")) onDeleteItem(key, item._id)
                }}
              />
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}

// One gallery item: photo or video, caption, per-item edit/delete.
function GalleryItem({ item, onUpdateCaption, onDelete }) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [draft, setDraft] = useState(item.caption)

  const saveCaption = () => {
    onUpdateCaption(draft)
    setEditingCaption(false)
  }

  return (
    <figure className="g-item">
      {item.mediaType === 'video' ? (
        <video src={item.url} controls preload="metadata" playsInline />
      ) : (
        <img src={item.url} alt={item.caption} loading="lazy" />
      )}
      <figcaption>
        {editingCaption ? (
          <span className="g-caption-edit">
            <input
              value={draft}
              maxLength={140}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Caption"
            />
            <button onClick={saveCaption}>✓</button>
            <button onClick={() => { setDraft(item.caption); setEditingCaption(false) }}>✕</button>
          </span>
        ) : (
          <span className="g-caption">{item.caption}</span>
        )}
        <span className="g-actions">
          {!editingCaption && <button onClick={() => setEditingCaption(true)} aria-label="Edit caption">✏️</button>}
          <button className="danger" onClick={onDelete} aria-label="Delete">🗑</button>
        </span>
      </figcaption>
    </figure>
  )
}

// ---------- day modal: gallery + uploads for one day ----------
function DayModal({ dayKeyValue, items, onAddItems, onUpdateItem, onDeleteItem, onClose }) {
  const [pending, setPending] = useState([]) // [{id, name, progress, status: 'uploading'|'error', error}]
  const [busy, setBusy] = useState(false)
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [url, setUrl] = useState('')
  const [urlCaption, setUrlCaption] = useState('')
  const [urlOk, setUrlOk] = useState(true)
  const fileRef = useRef(null)
  const uploadsConfigured = cloudinaryConfigured()

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    if (!uploadsConfigured) return

    const jobs = files.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name || 'photo',
      progress: 0,
      status: 'uploading',
      error: null,
    }))
    setPending((prev) => [...prev, ...jobs])
    setBusy(true)

    const done = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const job = jobs[i]
      if (file.size > MAX_UPLOAD_BYTES) {
        const error = `"${job.name}" is ${friendlySize(file.size)} — uploads cap out around 100 MB. Try a shorter clip.`
        setPending((prev) => prev.map((p) => (p.id === job.id ? { ...p, status: 'error', error } : p)))
        continue
      }
      try {
        const { url: uploadedUrl, mediaType } = await uploadFile(file, (fraction) => {
          setPending((prev) => prev.map((p) => (p.id === job.id ? { ...p, progress: fraction } : p)))
        })
        setPending((prev) => prev.filter((p) => p.id !== job.id))
        done.push({ url: uploadedUrl, caption: '', mediaType })
      } catch (err) {
        setPending((prev) =>
          prev.map((p) => (p.id === job.id ? { ...p, status: 'error', error: err.message } : p))
        )
      }
    }
    setBusy(false)
    if (done.length > 0) {
      try {
        await onAddItems(done)
      } catch {
        // addItems already surfaced the error; keep the modal open
      }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleAddUrl = async () => {
    if (!url.trim()) return
    await onAddItems([{ url: url.trim(), caption: urlCaption, mediaType: 'image' }])
    setUrl('')
    setUrlCaption('')
    setUrlOk(true)
    setShowUrlForm(false)
  }

  const countLabel = items.length === 0
    ? 'No memories yet'
    : items.length === 1
      ? '1 memory'
      : `${items.length} memories`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{prettyDate(dayKeyValue)}</h2>
        <p className="modal-sub">{countLabel} — photos and videos welcome.</p>

        {items.length > 0 && (
          <div className="modal-gallery">
            {items.map((item) => (
              <GalleryItem
                key={item._id}
                item={item}
                onUpdateCaption={(caption) => onUpdateItem(item._id, caption)}
                onDelete={() => {
                  if (window.confirm("Toss this memory? It'll be gone for good.")) onDeleteItem(item._id)
                }}
              />
            ))}
          </div>
        )}

        <div className="upload-block">
          <h3>📸 Add to this day</h3>
          {uploadsConfigured ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="file-input-hidden"
                id="day-upload-input"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <label htmlFor="day-upload-input" className="btn btn-primary btn-file">
                ＋ Choose photos / videos
              </label>
              <p className="upload-hint">
                Opens your camera roll right on your phone — pick as many as you like.
                Big videos love Wi-Fi. 📶
              </p>
            </>
          ) : (
            <p className="upload-hint setup-needed">
              📤 Direct uploads need the 5-minute Cloudinary setup first — ask Fred and
              you&apos;ll be snapping straight into the journal.
            </p>
          )}

          {pending.length > 0 && (
            <ul className="upload-queue">
              {pending.map((p) => (
                <li key={p.id} className={`upload-job${p.status === 'error' ? ' error' : ''}`}>
                  <span className="upload-name">{p.name}</span>
                  {p.status === 'uploading' ? (
                    <span className="upload-progress">
                      <span className="upload-bar"><span style={{ width: `${Math.round(p.progress * 100)}%` }} /></span>
                      <span className="upload-pct">{Math.round(p.progress * 100)}%</span>
                    </span>
                  ) : (
                    <span className="upload-error">{p.error}</span>
                  )}
                  {p.status === 'error' && (
                    <button onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}>Dismiss</button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button className="linklike" onClick={() => setShowUrlForm((v) => !v)}>
            {showUrlForm ? '▾ Hide the link option' : '▸ Or paste an image link instead'}
          </button>
          {showUrlForm && (
            <div className="url-form">
              <div className="field">
                <label htmlFor="photo-url">Photo URL</label>
                <input
                  id="photo-url"
                  type="url"
                  placeholder="https://… paste an image link here"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setUrlOk(true) }}
                />
              </div>
              {url.trim() && urlOk && (
                <div className="preview">
                  <img src={url.trim()} alt="preview" onError={() => setUrlOk(false)} />
                </div>
              )}
              {url.trim() && !urlOk && (
                <p className="preview-error">Hmm, that link didn&apos;t load a photo — double-check it?</p>
              )}
              <div className="field">
                <label htmlFor="photo-caption">One-line caption</label>
                <textarea
                  id="photo-caption"
                  rows={2}
                  maxLength={140}
                  placeholder="What made today today?"
                  value={urlCaption}
                  onChange={(e) => setUrlCaption(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleAddUrl} disabled={!url.trim() || busy}>
                ＋ Add this photo
              </button>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
