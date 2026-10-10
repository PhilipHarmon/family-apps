import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { API_BASE } from '../api.js';

// The big-screen view: the TV's browser opens ?tv=CODE and this component
// polls the public room endpoint (no family key — the TV can't enter one).
// Dark game-show theme, huge type, readable from couch distance.
const POLL_MS = 2500;

function sortedScores(room) {
  const list = Array.isArray(room.scores) ? room.scores : [];
  return [...list]
    .map((s) => ({ name: s.name || '?', score: Number(s.score) || 0 }))
    .sort((a, b) => b.score - a.score);
}

function WinnersFireworks() {
  useEffect(() => {
    const timers = [];
    const burst = (x, delay, particleCount = 70) => {
      timers.push(
        setTimeout(() => {
          confetti({
            particleCount,
            spread: 110,
            startVelocity: 45,
            origin: { x, y: 0.55 },
            disableForReducedMotion: true,
          });
        }, delay),
      );
    };
    burst(0.2, 0);
    burst(0.5, 250, 100);
    burst(0.8, 500);
    burst(0.35, 1200);
    burst(0.65, 1500, 100);
    burst(0.5, 2200, 120);
    return () => timers.forEach(clearTimeout);
  }, []);
  return null;
}

export default function TvScreen({ code }) {
  const [room, setRoom] = useState(null);
  const [missing, setMissing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let alive = true;
    let everLoaded = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tv/rooms/${encodeURIComponent(code)}`);
        if (!alive) return;
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRoom(data);
        setMissing(false);
        everLoaded = true;
        setReconnecting(false);
      } catch {
        if (!alive) return;
        // Keep the last good state on screen; only flag the hiccup.
        if (everLoaded) setReconnecting(true);
      }
    };

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [code]);

  if (missing) {
    return (
      <div className="tv-screen">
        <div className="tv-kicker">📺 Family Trivia Night</div>
        <h1 className="tv-hero">Hmm, can't find that game</h1>
        <p className="tv-sub">Check the code on the host's phone and try again.</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="tv-screen">
        <div className="tv-kicker">📺 Family Trivia Night</div>
        <h1 className="tv-hero">Tuning the big screen…</h1>
      </div>
    );
  }

  const status = room.status || 'waiting';
  const standings = sortedScores(room);
  const topScore = standings[0]?.score ?? 0;
  const leaders = standings.filter((s) => s.score === topScore).map((s) => s.name);
  const qNum = Number(room.qIndex) || 0;
  const qTotal = Number(room.qTotal) || 0;

  return (
    <div className="tv-screen">
      {reconnecting && <div className="tv-reconnecting">reconnecting…</div>}

      {status === 'waiting' && (
        <>
          <div className="tv-kicker">📺 Family Trivia Night</div>
          <h1 className="tv-hero">You're on the big screen!</h1>
          <p className="tv-sub">Waiting for the host to start the show…</p>
        </>
      )}

      {status === 'live' && (
        <>
          <div className="tv-kicker">📺 {room.title || 'Family Trivia Night'}</div>
          {qTotal > 0 && (
            <div className="tv-progress">Question {qNum + 1} of {qTotal}</div>
          )}
          {(room.tierLabel || room.points) && (
            <div className="tv-chips">
              {room.tierLabel && <span className="tv-chip">{room.tierLabel}</span>}
              {room.points ? <span className="tv-chip">⭐ {room.points} pts</span> : null}
            </div>
          )}
          <h1 className="tv-question">{room.question || '…'}</h1>
          <div className={room.revealed ? 'tv-answer tv-answer-reveal' : 'tv-answer'}>
            {room.revealed ? (
              <>{room.answer || '…'}</>
            ) : (
              <>🤫 Answer hidden — shout your guesses!</>
            )}
          </div>
          {standings.length > 0 && (
            <div className="tv-scores">
              {standings.map((s) => (
                <div key={s.name} className={`tv-score-row${leaders.includes(s.name) ? ' tv-leader' : ''}`}>
                  <span>{leaders.includes(s.name) ? '👑 ' : ''}{s.name}</span>
                  <span className="tv-pts">{s.score}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {status === 'done' && (
        <>
          <WinnersFireworks />
          <div className="tv-kicker">📺 {room.title || 'Family Trivia Night'}</div>
          <div className="tv-trophy" aria-hidden="true">🏆</div>
          {(room.winners && room.winners.length > 1) || leaders.length > 1 ? (
            <>
              <h1 className="tv-hero">It's a tie!</h1>
              <p className="tv-sub">{(room.winners && room.winners.length ? room.winners : leaders).join(' & ')} share the crown!</p>
            </>
          ) : (
            <>
              <h1 className="tv-hero">{(room.winners && room.winners[0]) || leaders[0] || 'Nobody'} wins!</h1>
              <p className="tv-sub">Certified household genius. 🏆</p>
            </>
          )}
          {standings.length > 0 && (
            <div className="tv-scores">
              {standings.map((s, i) => (
                <div key={s.name} className={`tv-score-row${i === 0 ? ' tv-leader' : ''}`}>
                  <span>{i === 0 ? '🥇 ' : `${i + 1}. `}{s.name}</span>
                  <span className="tv-pts">{s.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
