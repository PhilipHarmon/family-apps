import { useEffect, useRef, useState } from 'react';

/* Fair teller spinner: a real spinning wheel. The winner is chosen up front
 * (uniform random from the remaining pool), then the wheel animates so the
 * pointer lands on them. Everyone is picked once before anyone repeats —
 * the parent owns the pool and removes each winner. */
const COLORS = ['#e4572e', '#f3a712', '#2ca58d', '#3f7fbf', '#9b5de5', '#f15bb5'];
const SPIN_MS = 4200;

export default function Spinner({ names, onLanded, disabled }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landedName, setLandedName] = useState(null);
  const rotRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const n = names.length;
  const seg = n > 0 ? 360 / n : 360;
  const gradient =
    n > 0
      ? `conic-gradient(${names
          .map((_, i) => `${COLORS[i % COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`)
          .join(', ')})`
      : '#555';

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const spin = () => {
    if (spinning || disabled || n === 0) return;
    const winner = names[Math.floor(Math.random() * n)];
    const wi = names.indexOf(winner);
    setLandedName(null);
    if (reduceMotion) {
      onLanded(winner);
      return;
    }
    setSpinning(true);
    // Pointer sits at top (0deg). Winner segment center is at wi*seg + seg/2
    // clockwise from top, so rotate the wheel so that point lands at 0.
    const target = ((360 - (wi * seg + seg / 2)) % 360 + 360) % 360;
    const next = Math.ceil(rotRef.current / 360) * 360 + 360 * 5 + target;
    rotRef.current = next;
    setRotation(next);
    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setLandedName(winner);
      onLanded(winner);
    }, SPIN_MS + 100);
  };

  const labelPos = (i) => {
    const a = ((i * seg + seg / 2) * Math.PI) / 180; // clockwise from top
    return {
      left: `${50 + 34 * Math.sin(a)}%`,
      top: `${50 - 34 * Math.cos(a)}%`,
    };
  };

  return (
    <div className="spinner-wrap">
      <div
        className="spinner-wheel"
        style={{
          background: gradient,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.16, 1)` : 'none',
        }}
        aria-hidden="true"
      >
        {names.map((name, i) => (
          <span key={`${name}-${i}`} className="spinner-label" style={labelPos(i)}>
            {name}
          </span>
        ))}
        <span className="spinner-hub-star" aria-hidden="true">✦</span>
      </div>
      <div className="spinner-pointer" aria-hidden="true" />
      <button
        className="btn btn-spin"
        onClick={spin}
        disabled={spinning || disabled || n === 0}
        aria-live="polite"
      >
        {spinning ? 'Spinning…' : n === 0 ? 'Everyone has gone!' : '🎡 SPIN'}
      </button>
      {landedName && !spinning && (
        <div className="spinner-landed" role="status">
          🎉 <strong>{landedName}</strong> goes next!
        </div>
      )}
      <p className="spinner-pool">
        {n > 0 ? `${n} teller${n === 1 ? '' : 's'} left in the hat` : 'Hat is empty — round complete!'}
      </p>
    </div>
  );
}
