import { useCallback, useEffect, useState } from "react";
import Cassette from "./components/Cassette.jsx";
import FamilyKeyPrompt from "./components/FamilyKeyPrompt.jsx";
import {
  get,
  post,
  del,
  getFamilyKey,
  saveFamilyKey,
  normalizeTape,
} from "./api.js";
import { isDemoMode } from "./demoMode.js";

const MIN_PER_TRACK = 3.4; // flavor math for "runtime-ish" text

/* Seed tape — copied verbatim from the original localStorage version.
   On first load (empty API library), this is POSTed to the API once. */
const SEED_TAPE = {
  title: "Teenage Classic",
  sideA: [
    { title: "Take On Me", artist: "a-ha" },
    { title: "Don't You (Forget About Me)", artist: "Simple Minds" },
    { title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper" },
  ],
  sideB: [
    { title: "Sweet Dreams (Are Made of This)", artist: "Eurythmics" },
    { title: "You Spin Me Round (Like a Record)", artist: "Dead or Alive" },
    { title: "Bron-Yr-Aur", artist: "Led Zeppelin" },
  ],
};

function runtimeFlavor(trackCount) {
  const mins = Math.round(trackCount * MIN_PER_TRACK);
  if (trackCount === 0) return "a blank tape full of potential";
  return `≈ ${mins} minutes of pure gold`;
}

/* ================= Library ================= */
function Library({ tapes, onNew, onView, onDelete }) {
  return (
    <div>
      <div className="library-actions">
        <button onClick={onNew}>🎶 Dub a New Tape</button>
      </div>
      {tapes.length === 0 ? (
        <div className="empty-library">
          <h2>The shelf is empty…</h2>
          <p>No tapes yet. Every legendary collection starts with a single dub.</p>
          <button onClick={onNew}>Make your first tape</button>
        </div>
      ) : (
        <div className="tape-grid">
          {tapes.map((t) => {
            const total = t.sideA.length + t.sideB.length;
            const closer = t.sideB[t.sideB.length - 1];
            return (
              <div className="tape-card" key={t.id}>
                <h3>{t.title}</h3>
                <p className="meta">
                  {total} track{total === 1 ? "" : "s"} · {runtimeFlavor(total)}
                  <br />
                  Side A: {t.sideA.length} · Side B: {t.sideB.length}
                  {closer && (
                    <>
                      <br />★ Closes with “{closer.title}”
                    </>
                  )}
                </p>
                <div className="card-actions">
                  <button className="small" onClick={() => onView(t.id)}>Spin it ▶</button>
                  <button
                    className="danger small"
                    onClick={() => {
                      if (window.confirm(`Rewind and erase “${t.title}” forever?`)) onDelete(t.id);
                    }}
                  >
                    Erase
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= Editor ================= */
function SideEditor({ side, tracks, onAdd, onRemove }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const add = () => {
    const t = title.trim();
    if (!t) return;
    onAdd({ title: t, artist: artist.trim() || "Unknown Artist" });
    setTitle("");
    setArtist("");
  };

  const isB = side === "B";

  return (
    <div className="side-panel">
      <h3><span className="side-badge">{side}</span> Side {side}</h3>
      {isB && (
        <p className="rule-note">
          Sacred rule: the last track on Side B is <strong>The Closer</strong>. Choose wisely — this is the one they remember.
        </p>
      )}
      {tracks.length === 0 && (
        <p className="rule-note">Nothing here yet. The tape is patient. You shouldn't be.</p>
      )}
      {tracks.map((t, i) => {
        const isCloser = isB && i === tracks.length - 1;
        return (
          <div key={i} className={`track-row${isCloser ? " is-closer" : ""}`}>
            <span className="num">{i + 1}</span>
            <span className="track-info">
              <span className="t">{isCloser ? "★ " : ""}{t.title}</span>
              {isCloser && <span className="closer-tag">The Closer</span>}
              <br />
              <span className="a">{t.artist}</span>
            </span>
            <button onClick={() => onRemove(i)} aria-label={`Remove ${t.title}`}>✕</button>
          </div>
        );
      })}
      <div className="add-track">
        <div className="two-col">
          <input
            type="text"
            placeholder={isB ? "e.g. Bron-Yr-Aur" : "e.g. Take On Me"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            maxLength={80}
          />
          <input
            type="text"
            placeholder="e.g. Led Zeppelin"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            maxLength={80}
          />
        </div>
        <button className="ghost small" onClick={add}>+ Add to Side {side}</button>
      </div>
    </div>
  );
}

function Editor({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [sideA, setSideA] = useState([]);
  const [sideB, setSideB] = useState([]);

  const save = () => {
    const t = title.trim() || "Untitled Tape";
    onSave({ title: t, sideA, sideB });
  };

  return (
    <div className="editor">
      <div className="editor-title-row">
        <label htmlFor="tape-title">Name your tape</label>
        <input
          id="tape-title"
          type="text"
          placeholder={"Something legendary, like \u201cSummer \u201926\u201d or \u201cDriving at Midnight\u201d"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
        />
      </div>
      <div className="sides">
        <SideEditor
          side="A"
          tracks={sideA}
          onAdd={(t) => setSideA([...sideA, t])}
          onRemove={(i) => setSideA(sideA.filter((_, j) => j !== i))}
        />
        <SideEditor
          side="B"
          tracks={sideB}
          onAdd={(t) => setSideB([...sideB, t])}
          onRemove={(i) => setSideB(sideB.filter((_, j) => j !== i))}
        />
      </div>
      <div className="editor-actions">
        <button onClick={save}>💾 Save This Tape</button>
        <button className="ghost" onClick={onCancel}>Never mind</button>
      </div>
    </div>
  );
}

/* ================= Viewer ================= */
function Viewer({ tape, onBack, onDelete }) {
  const [side, setSide] = useState("A");
  const total = tape.sideA.length + tape.sideB.length;
  const closer = tape.sideB[tape.sideB.length - 1];
  const shown = side === "A" ? tape.sideA : tape.sideB;

  return (
    <div className="viewer">
      <h2>{tape.title}</h2>
      <p className="flavor">
        {total} track{total === 1 ? "" : "s"} · {runtimeFlavor(total)} · dubbed with love
      </p>

      <Cassette tape={tape} side={side} />

      <div className="side-flip" role="tablist" aria-label="Flip the tape">
        <button className={side === "A" ? "active" : ""} onClick={() => setSide("A")}>◀ Side A</button>
        <button className={side === "B" ? "active" : ""} onClick={() => setSide("B")}>Side B ▶</button>
      </div>

      <div className="full-tracklist">
        <h3><span className="side-badge">{side}</span> Side {side} track listing</h3>
        {shown.length === 0 ? (
          <p className="flavor">Quiet on this side… for now.</p>
        ) : (
          <ol>
            {shown.map((t, i) => {
              const isCloser = side === "B" && i === shown.length - 1;
              return (
                <li key={i} className={isCloser ? "closer" : ""}>
                  <span className="n">{i + 1}</span>
                  <span className="info">
                    <span className="t">{isCloser ? "★ " : ""}{t.title}</span>
                    {isCloser && <span className="closer-tag">The Closer</span>}
                    <br />
                    <span className="a">{t.artist}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {closer && side === "B" && (
        <div className="closer-copy">
          ★ “{closer.title}” by {closer.artist} — the closer.
          <br />Every great tape ends with the perfect closer.
        </div>
      )}

      <div className="viewer-actions">
        <button className="ghost" onClick={onBack}>← Back to the shelf</button>
        <button
          className="danger"
          onClick={() => {
            if (window.confirm(`Rewind and erase “${tape.title}” forever?`)) onDelete(tape.id);
          }}
        >
          Erase this tape
        </button>
      </div>
    </div>
  );
}

/* ================= App ================= */
export default function App() {
  const demoMode = isDemoMode();
  const [familyKey, setFamilyKey] = useState(() => getFamilyKey());
  const [keyError, setKeyError] = useState(null);
  const [tapes, setTapes] = useState([]);
  const [view, setView] = useState({ name: "library" });
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);

  /* A 401 from the API (thrown inside api.js) clears the stored key and fires
     this event — we drop back to the key prompt so the user can re-enter. */
  useEffect(() => {
    const onInvalid = () => {
      setFamilyKey(null);
      setKeyError("That key didn't work — give it another go.");
    };
    window.addEventListener("family-key-invalid", onInvalid);
    return () => window.removeEventListener("family-key-invalid", onInvalid);
  }, []);

  const loadTapes = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      let list = await get("/tapes");
      let normalized = (Array.isArray(list) ? list : [])
        .map(normalizeTape)
        .filter(Boolean);
      if (normalized.length === 0) {
        // First load with an empty shelf: seed the classic, then re-fetch.
        await post("/tapes", {
          title: SEED_TAPE.title,
          sideA: SEED_TAPE.sideA,
          sideB: SEED_TAPE.sideB,
        });
        list = await get("/tapes");
        normalized = (Array.isArray(list) ? list : [])
          .map(normalizeTape)
          .filter(Boolean);
      }
      setTapes(normalized);
      setStatus("ready");
    } catch (e) {
      if (e && e.unauthorized) return; // key prompt re-shows via the event
      setError(e && e.message ? e.message : "Something jammed the tape deck.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (familyKey || demoMode) loadTapes();
  }, [familyKey, demoMode, loadTapes]);

  const handleKeySave = (key) => {
    saveFamilyKey(key);
    setKeyError(null);
    setFamilyKey(key);
  };

  const deleteTape = async (id) => {
    try {
      await del(`/tapes/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e && e.unauthorized) return;
      window.alert(`Couldn't erase that tape: ${e && e.message ? e.message : "unknown hiccup"}`);
      return;
    }
    setTapes(tapes.filter((t) => t.id !== id));
    setView({ name: "library" });
  };

  const saveNewTape = async ({ title, sideA, sideB }) => {
    try {
      const created = normalizeTape(await post("/tapes", { title, sideA, sideB }));
      if (!created) throw new Error("The API didn't return the new tape.");
      setTapes((prev) => [created, ...prev]);
      setView({ name: "viewer", id: created.id });
    } catch (e) {
      if (e && e.unauthorized) return;
      window.alert(`Couldn't save that tape: ${e && e.message ? e.message : "unknown hiccup"}`);
    }
  };

  return (
    <div className="app">
      {demoMode && (
        <div
          style={{
            background: "linear-gradient(90deg, #f2c57c 0%, #e59a5f 100%)",
            color: "#3d2410",
            padding: "7px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.3px",
            borderBottom: "3px double rgba(61,36,16,0.4)",
            flexWrap: "wrap",
          }}
        >
          <span>📼 Demo preview — sample data, saved in this browser only.</span>
          <button
            onClick={() => {
              localStorage.removeItem("demoData:mixtape");
              window.location.reload();
            }}
            style={{
              background: "#3d2410",
              color: "#f7e8d0",
              border: "none",
              borderRadius: "999px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reset demo
          </button>
        </div>
      )}
      {!familyKey && !demoMode && (
        <FamilyKeyPrompt onSave={handleKeySave} error={keyError} />
      )}

      <header className="top">
        <h1>📼 Mixtape</h1>
        <p className="tagline">Dub it. Flip it. Never skip the closer.</p>
      </header>

      {(familyKey || demoMode) && status === "loading" && (
        <div className="empty-library">
          <h2>🎧 Tuning the deck…</h2>
          <p>Grabbing everyone's tapes from the family shelf.</p>
        </div>
      )}

      {(familyKey || demoMode) && status === "error" && (
        <div className="empty-library">
          <h2>📼 The tape deck jammed</h2>
          <p>{error}</p>
          <button onClick={loadTapes}>Retry</button>
        </div>
      )}

      {(familyKey || demoMode) && status === "ready" && view.name === "library" && (
        <Library
          tapes={tapes}
          onNew={() => setView({ name: "editor" })}
          onView={(id) => setView({ name: "viewer", id })}
          onDelete={deleteTape}
        />
      )}

      {(familyKey || demoMode) && status === "ready" && view.name === "editor" && (
        <Editor
          onSave={saveNewTape}
          onCancel={() => setView({ name: "library" })}
        />
      )}

      {(familyKey || demoMode) && status === "ready" && view.name === "viewer" &&
        (() => {
          const tape = tapes.find((t) => t.id === view.id);
          if (!tape) return <p>That tape seems to have demagnetized. <button className="ghost" onClick={() => setView({ name: "library" })}>Back to the shelf</button></p>;
          return <Viewer tape={tape} onBack={() => setView({ name: "library" })} onDelete={deleteTape} />;
        })()}

      <footer className="foot">
        Rule #1 of mixtape club: Side B always ends with a killer closer. No exceptions.
      </footer>
    </div>
  );
}
