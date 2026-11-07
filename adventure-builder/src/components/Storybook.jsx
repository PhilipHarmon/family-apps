import { useEffect, useRef, useState } from 'react';
import { get, post } from '../api.js';
import {
  assembleBook,
  clampPageIndex,
  turnPage,
  isFirstPage,
  isLastPage,
} from '../lib/storybook.js';
import { cloudinaryConfigured, uploadFile } from '../cloudinary.js';

const ART_BASE = `${import.meta.env.BASE_URL}storybook`;
export const MAX_FIELD_PHOTOS = 6;

// A photo ref is usually a plain URL string; tolerate the media route's
// object shape ({ imageUrl }) too, since books store refs as they came.
function photoUrl(ref) {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref.imageUrl || ref.url || ref.src || '';
}

function bookId(book) {
  return book?.id || book?._id || null;
}

// ---------- the reader ----------

// Full-screen page-turner: one big illustration, a few large lines of
// story, tap the edges or swipe to turn. Built for a parent reading
// one-handed at bedtime — everything important is huge.
export function StorybookReader({ book, onClose, notice }) {
  const pages = book?.pages || [];
  const [index, setIndex] = useState(0);
  const touchX = useRef(null);
  const page = pages[clampPageIndex(index, pages.length)];

  const go = (dir) => setIndex((i) => turnPage(i, dir, pages.length));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  if (!page) {
    return (
      <div className="reader-overlay" role="dialog" aria-modal="true" aria-label="Storybook">
        <div className="reader-top">
          <span className="reader-book-title">{book?.title || 'Storybook'}</span>
          <button type="button" className="reader-close" onClick={onClose} aria-label="Close the book">✕</button>
        </div>
        <p className="reader-notice">This book has no pages yet.</p>
      </div>
    );
  }

  const first = isFirstPage(index);
  const last = isLastPage(index, pages.length);
  const isPhotos = page.type === 'photos';
  const photos = (page.photos || []).map(photoUrl).filter(Boolean);

  return (
    <div
      className="reader-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Reading ${book?.title || 'storybook'}`}
      onTouchStart={(e) => { touchX.current = e.changedTouches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="reader-top">
        <span className="reader-book-title">📖 {book?.title || 'Storybook'}</span>
        <button type="button" className="reader-close" onClick={onClose} aria-label="Close the book">✕</button>
      </div>

      {notice && <p className="reader-notice">{notice}</p>}

      <div className="reader-stage" key={index}>
        {isPhotos ? (
          <div className="reader-photos">
            {photos.length
              ? photos.map((url, i) => (
                <img key={i} src={url} alt={`Field photo ${i + 1} from the day`} loading="lazy" />
              ))
              : <p className="reader-line">No photos on this page.</p>}
          </div>
        ) : (
          <img
            className="reader-art"
            src={`${ART_BASE}/${page.illustration || 'cover'}.jpg`}
            alt=""
          />
        )}

        {page.title && <h2 className="reader-title">{page.title}</h2>}

        <div className="reader-lines">
          {(page.lines || []).map((line, i) => (
            <p className="reader-line" key={i}>{line}</p>
          ))}
        </div>

        {page.items && page.items.length > 0 && (
          <ul className="reader-items">
            {page.items.map((item, i) => (
              <li key={i}>🔎 {item}</li>
            ))}
          </ul>
        )}

        {last && <p className="reader-end">🏁 The End 🏁</p>}
      </div>

      <button
        type="button"
        className="reader-nav prev"
        onClick={() => go(-1)}
        disabled={first}
        aria-label="Previous page"
      >
        ‹
      </button>
      <button
        type="button"
        className="reader-nav next"
        onClick={() => go(1)}
        disabled={last}
        aria-label="Next page"
      >
        ›
      </button>

      <div className="reader-foot">
        <div className="reader-dots" aria-hidden="true">
          {pages.map((_, i) => (
            <span key={i} className={`reader-dot${i === index ? ' on' : ''}`} />
          ))}
        </div>
        <p className="reader-count">Page {index + 1} of {pages.length}</p>
      </div>
    </div>
  );
}

// ---------- the completion flow ----------

// Photos step (optional) → generate → save in the background → read.
// The book ALWAYS opens, saved or not; a failed save only changes the
// little notice at the top of the reader.
export function StorybookFlow({ mission, onClose }) {
  const [picked, setPicked] = useState([]); // [{ url, name }]
  const [uploading, setUploading] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const [book, setBook] = useState(null);
  const [saveNotice, setSaveNotice] = useState('');
  const uploadsOn = cloudinaryConfigured();

  const addFiles = async (fileList) => {
    const files = [...fileList].slice(0, MAX_FIELD_PHOTOS - picked.length);
    if (!files.length) return;
    setPhotoError('');
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const { url } = await uploadFile(file);
        // Register the photo with the family's media path too, so the
        // day's pictures live with the rest of the family photos.
        // Best-effort only — the book keeps its own ref either way.
        try {
          await post('/photos', {
            date: new Date().toISOString().slice(0, 10),
            imageUrl: url,
            caption: mission?.briefing?.title || 'Adventure field photo',
            mediaType: 'image',
          });
        } catch {
          // registration is a bonus; the upload itself succeeded
        }
        setPicked((p) => [...p, { url, name: file.name }]);
      } catch (err) {
        setPhotoError(err.message || 'That photo didn’t upload.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const makeBook = () => {
    const built = assembleBook(mission, picked.map((p) => p.url));
    setBook(built);
    // Save in the background — the reader opens either way.
    post('/storybooks', built)
      .then(() => setSaveNotice('✓ Saved to My Storybooks.'))
      .catch(() => setSaveNotice(
        'This book couldn’t be saved to the family library yet — enjoy it now! It just won’t be on the shelf later.',
      ));
  };

  if (book) {
    return (
      <StorybookReader
        book={book}
        notice={saveNotice || undefined}
        onClose={onClose}
      />
    );
  }

  return (
    <section className="sb-flow">
      <h2 className="screen-title">📖 Make our storybook</h2>
      <p className="hint">
        “{mission?.briefing?.title}” becomes a bedtime book — the crew, their roles,
        and every treasure they really found. Want photos from the day in it?
      </p>

      <h3 className="sb-subhead">📸 Field photos (optional, up to {MAX_FIELD_PHOTOS})</h3>
      {uploadsOn ? (
        <>
          <div className="sb-thumbs">
            {picked.map((p, i) => (
              <figure className="sb-thumb" key={p.url}>
                <img src={p.url} alt={p.name} />
                <button
                  type="button"
                  className="sb-thumb-x"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => setPicked((list) => list.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </figure>
            ))}
            {picked.length < MAX_FIELD_PHOTOS && (
              <label className="sb-add">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
                <span>＋<br />Add photos</span>
              </label>
            )}
          </div>
          {uploading > 0 && <p className="hint">Uploading {uploading} photo{uploading === 1 ? '' : 's'}…</p>}
          {photoError && <p className="sb-error">{photoError}</p>}
        </>
      ) : (
        <p className="hint">
          Photo uploads aren’t switched on for this app yet — no problem,
          the book works beautifully without them. Skip ahead!
        </p>
      )}

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary btn-big"
          onClick={makeBook}
          disabled={uploading > 0}
        >
          📖 Make our book
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Not right now
        </button>
      </div>
      <p className="hint">
        {picked.length
          ? `${picked.length} photo${picked.length === 1 ? '' : 's'} will ride along on the last page.`
          : 'No photos? The last page simply stays home — the story is the treasure.'}
      </p>
    </section>
  );
}

// ---------- the shelf ----------

// "My Storybooks": saved books from family-api, newest first. Reopening
// a book fetches its saved pages — it never regenerates anything.
export function StorybookShelf({ onOpen }) {
  const [state, setState] = useState({ status: 'loading', books: [] });

  useEffect(() => {
    let alive = true;
    get('/storybooks')
      .then((data) => {
        if (!alive) return;
        const books = Array.isArray(data) ? data : (data?.storybooks || []);
        setState({ status: 'ready', books });
      })
      .catch(() => {
        if (alive) setState({ status: 'unavailable', books: [] });
      });
    return () => { alive = false; };
  }, []);

  const openBook = async (summary) => {
    const id = bookId(summary);
    if (!id) { onOpen(summary); return; }
    try {
      const full = await get(`/storybooks/${id}`);
      onOpen(full && full.pages ? full : summary);
    } catch {
      onOpen(summary);
    }
  };

  return (
    <section>
      <h2 className="screen-title">📚 My Storybooks</h2>
      {state.status === 'loading' && <p className="hint">Fetching the bookshelf…</p>}
      {state.status === 'unavailable' && (
        <p className="hint">
          The family bookshelf isn’t connected yet. Finish a mission and tap
          “Make our storybook” — once the library is switched on, your books will live here.
        </p>
      )}
      {state.status === 'ready' && state.books.length === 0 && (
        <p className="hint">No storybooks yet. The first finished mission gets the first book!</p>
      )}
      <div className="sb-grid">
        {state.books.map((b) => (
          <button
            type="button"
            key={bookId(b) || b.title}
            className="sb-card"
            onClick={() => openBook(b)}
          >
            <img src={`${ART_BASE}/cover.jpg`} alt="" />
            <span className="sb-card-title">{b.title}</span>
            <span className="sb-card-date">
              {b.date
                ? new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : ''}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
