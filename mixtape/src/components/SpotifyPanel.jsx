import { useState } from "react";
import {
  isSpotifyConfigured,
  isSpotifyConnected,
  startSpotifyLogin,
  disconnectSpotify,
  searchTrack,
  createPlaylistWithTracks,
} from "../spotify.js";
import { isDemoMode } from "../demoMode.js";

/**
 * "Hear this tape" panel inside the tape viewer.
 * Matches each track against Spotify, plays previews through an embedded
 * player, and can save the whole tape as a real Spotify playlist.
 */
export default function SpotifyPanel({ tape }) {
  const [phase, setPhase] = useState("idle"); // idle|matching|ready|saving|done|error
  const [matches, setMatches] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const [playlistUrl, setPlaylistUrl] = useState(null);
  const [error, setError] = useState(null);

  if (!isSpotifyConfigured() || isDemoMode()) return null;

  const connected = isSpotifyConnected();
  const tracks = [...tape.sideA, ...tape.sideB];

  const matchAll = async () => {
    setPhase("matching");
    setError(null);
    try {
      const results = [];
      for (const t of tracks) {
        try {
          results.push({ track: t, spotify: await searchTrack(t.title, t.artist) });
        } catch {
          results.push({ track: t, spotify: null });
        }
      }
      setMatches(results);
      const first = results.find((r) => r.spotify);
      setPlayingId(first ? first.spotify.id : null);
      setPhase("ready");
    } catch (e) {
      setError(e?.message || "Couldn't reach Spotify.");
      setPhase("error");
    }
  };

  const savePlaylist = async () => {
    setPhase("saving");
    setError(null);
    try {
      const uris = matches.filter((m) => m.spotify).map((m) => m.spotify.uri);
      const { url } = await createPlaylistWithTracks(tape.title, uris);
      setPlaylistUrl(url);
      setPhase("done");
    } catch (e) {
      setError(e?.message || "Couldn't save the playlist.");
      setPhase("ready");
    }
  };

  const missing = matches.filter((m) => !m.spotify).length;

  return (
    <div className="spotify-panel">
      <h3>🎧 Hear this tape</h3>

      {!connected && phase === "idle" && (
        <>
          <p className="flavor">
            Connect Spotify to match these tracks, preview them right here,
            and save the whole tape as a real playlist.
          </p>
          <button onClick={() => startSpotifyLogin(tape.id)}>
            Connect Spotify
          </button>
        </>
      )}

      {connected && phase === "idle" && (
        <>
          <p className="flavor">
            Spotify is connected. Let's find these tracks.
          </p>
          <div className="row-actions">
            <button onClick={matchAll}>🔎 Match tracks</button>
            <button
              className="ghost small"
              onClick={() => {
                disconnectSpotify();
                setMatches([]);
                setPlayingId(null);
                setPhase("idle");
              }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}

      {phase === "matching" && (
        <p className="flavor">🎶 Digging through the crates…</p>
      )}

      {(phase === "ready" || phase === "saving" || phase === "done") && (
        <>
          {playingId && (
            <iframe
              title="Spotify preview player"
              src={`https://open.spotify.com/embed/track/${playingId}?utm_source=generator`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="spotify-embed"
            />
          )}
          <ol className="spotify-matches">
            {matches.map((m, i) => (
              <li key={i} className={m.spotify ? "" : "unmatched"}>
                {m.spotify ? (
                  <button
                    className={`match-row${playingId === m.spotify.id ? " playing" : ""}`}
                    onClick={() => setPlayingId(m.spotify.id)}
                  >
                    {m.spotify.image && (
                      <img src={m.spotify.image} alt="" width="40" height="40" />
                    )}
                    <span className="info">
                      <span className="t">{m.spotify.name}</span>
                      <br />
                      <span className="a">{m.spotify.artist}</span>
                    </span>
                    <span className="play-ind">{playingId === m.spotify.id ? "▶" : "▷"}</span>
                  </button>
                ) : (
                  <span className="match-row">
                    <span className="info">
                      <span className="t">{m.track.title}</span>
                      <br />
                      <span className="a">
                        {m.track.artist} — couldn't find it on Spotify
                      </span>
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ol>
          {missing > 0 && (
            <p className="flavor">
              {missing} track{missing === 1 ? "" : "s"} didn't match —{" "}
              {missing === 1 ? "it'll" : "they'll"} be skipped in the playlist.
            </p>
          )}
          {phase !== "done" ? (
            <button onClick={savePlaylist} disabled={phase === "saving"}>
              {phase === "saving"
                ? "Dubbing…"
                : "💾 Save as Spotify playlist"}
            </button>
          ) : (
            <p className="flavor success">
              🎉 It's live!{" "}
              <a href={playlistUrl} target="_blank" rel="noreferrer noopener">
                Open “{tape.title}” on Spotify ↗
              </a>
            </p>
          )}
        </>
      )}

      {phase === "error" && (
        <p className="flavor">
          📼 The deck jammed: {error}{" "}
          <button className="ghost small" onClick={() => setPhase(connected ? "idle" : "idle")}>
            Try again
          </button>
        </p>
      )}
      {error && phase !== "error" && <p className="flavor">⚠️ {error}</p>}
    </div>
  );
}
