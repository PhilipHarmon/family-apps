import { useEffect, useRef, useState } from "react";
import { get } from "../api.js";

/**
 * Spotify track search for the tape editor. Type a song or artist, pick a
 * result, and the exact track (title, artist, Spotify id + link) is added.
 * onPick receives { title, artist, spotifyId, spotifyUrl }.
 */
export default function TrackSearch({ onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const runSearch = async (query) => {
    const stamp = ++latest.current;
    setBusy(true);
    setFailed(false);
    try {
      const hits = await get("/spotify/search?q=" + encodeURIComponent(query));
      if (latest.current !== stamp) return;
      setResults(Array.isArray(hits) ? hits : []);
      setOpen(true);
    } catch {
      // Demo mode 404s unknown paths and a misconfigured server 503s —
      // either way, fall back to the manual inputs below.
      if (latest.current !== stamp) return;
      setResults([]);
      setOpen(false);
      setFailed(true);
    } finally {
      if (latest.current === stamp) setBusy(false);
    }
  };

  const onChange = (e) => {
    const v = e.target.value;
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setFailed(false);
      return;
    }
    timer.current = setTimeout(() => runSearch(v.trim()), 350);
  };

  const pick = (r) => {
    onPick({
      title: r.name,
      artist: r.artists,
      spotifyId: r.id,
      spotifyUrl: r.url,
    });
    setQ("");
    setResults([]);
    setOpen(false);
    setFailed(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && open && results.length > 0) {
      e.preventDefault();
      pick(results[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="track-search">
      <label className="ts-label" htmlFor="track-search-input">
        🔎 Search Spotify for a song or artist…
      </label>
      <input
        id="track-search-input"
        type="search"
        autoComplete="off"
        placeholder="e.g. Take On Me or a-ha"
        value={q}
        onChange={onChange}
        onKeyDown={onKeyDown}
        maxLength={120}
      />
      {busy && <p className="ts-status">Digging through the crates…</p>}
      {open && results.length > 0 && (
        <ul className="ts-results" role="listbox" aria-label="Spotify results">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="ts-row" onClick={() => pick(r)}>
                {r.image ? (
                  <img src={r.image} alt="" width="40" height="40" loading="lazy" />
                ) : (
                  <span className="ts-noimg" aria-hidden="true">♪</span>
                )}
                <span className="ts-info">
                  <span className="ts-name">{r.name}</span>
                  <span className="ts-artists">
                    {r.artists}
                    {r.album ? ` · ${r.album}` : ""}
                  </span>
                </span>
                <span className="ts-add" aria-hidden="true">+ Add</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && !busy && !failed && (
        <p className="ts-status">No matches — try different words, or add it by hand below.</p>
      )}
      {failed && (
        <p className="ts-fallback">
          Spotify search isn't available right now — add it by hand below.
        </p>
      )}
    </div>
  );
}
