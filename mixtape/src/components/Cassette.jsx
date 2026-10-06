import React from "react";

/**
 * Pure-CSS cassette visual. Shows the given side's track list on the label;
 * the closer (last track of Side B) always gets gold treatment.
 */
export default function Cassette({ tape, side }) {
  const tracks = side === "A" ? tape.sideA : tape.sideB;
  const closer = tape.sideB[tape.sideB.length - 1];
  const showingCloser = side === "B" && closer;

  return (
    <div className="cassette-stage">
      <div className="cassette" role="img" aria-label={`Cassette for ${tape.title}, side ${side}`}>
        <span className="screw tl" />
        <span className="screw tr" />
        <span className="screw bl" />
        <span className="screw br" />

        <div className="cassette-label">
          <div className="label-top">
            <span className="label-title">{tape.title}</span>
            <span className="label-side">SIDE {side}</span>
          </div>
          <div className="label-stripes" />

          <div className="reel-window">
            <div className="tape-path" />
            <div className="reel left" />
            <div className="reel right" />
          </div>

          <div className={`label-tracks${tracks.length > 4 ? " two-col" : ""}`}>
            {tracks.length === 0 && (
              <div className="lt"><span className="a">(nothing dubbed yet — add some tracks!)</span></div>
            )}
            {tracks.map((t, i) => {
              const isCloser = side === "B" && i === tracks.length - 1;
              return (
                <div key={i} className={`lt${isCloser ? " closer-line" : ""}`}>
                  <span className="n">{i + 1}.</span>
                  {isCloser ? "★ " : ""}{t.title} <span className="a">— {t.artist}</span>
                </div>
              );
            })}
          </div>

          {showingCloser && (
            <div className="label-closer-chip">★ The Closer ★</div>
          )}
        </div>

        <div className="cassette-bottom" />
      </div>
    </div>
  );
}
