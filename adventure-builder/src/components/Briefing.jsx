import Avatar from './Avatar.jsx';
import { SETTINGS, DURATIONS, labelOf, driveBadge, costBadge } from '../lib/labels.js';
import { BAND_EMOJI } from '../data/family.js';

// The mission briefing: a storybook page. This is also the printable
// mission sheet — print CSS strips the buttons and app chrome.
export default function Briefing({ briefing, onStart, onBack }) {
  const huntGroups = [
    { key: 'easy', title: '🌟 Easy Finds — for the littlest explorers', items: briefing.hunt.easy },
    { key: 'standard', title: '🔍 The Hunt', items: briefing.hunt.standard },
    { key: 'expert', title: '⭐ Expert Challenges', items: briefing.hunt.expert },
  ].filter((g) => g.items.length);

  return (
    <article className="storybook" id="briefing-sheet">
      <p className="kicker">✦ Official Mission Briefing ✦</p>
      <h2 className="story-title">{briefing.title}</h2>

      <div className="badge-row">
        <span className="badge">{labelOf(SETTINGS, briefing.setting)}</span>
        <span className="badge">{labelOf(DURATIONS, briefing.duration)}</span>
        <span className="badge">{driveBadge(briefing.drive)}</span>
        <span className="badge">{costBadge(briefing.cost)}</span>
        {briefing.fallback && <span className="badge badge-warm">Made-up mission</span>}
      </div>

      {briefing.placeName && (
        <p className="place-note">
          📍 {briefing.placeName} · {briefing.placeArea}. Drive time and cost are a rough guide — check before you go.
        </p>
      )}

      <p className="story">{briefing.intro}</p>

      <h3>🎭 Crew Roles</h3>
      <div className="roles">
        {briefing.roles.map((r) => (
          <div className="role-card" key={r.personId}>
            <Avatar person={r} size={46} />
            <div>
              <p className="role-head">
                <strong>{r.name}</strong> {BAND_EMOJI[r.band]} is the{' '}
                <strong>
                  {r.emoji} {r.roleTitle}
                </strong>
              </p>
              <p className="role-task">{r.task}</p>
            </div>
          </div>
        ))}
      </div>

      <h3>🗺️ The Plan</h3>
      <ol className="steps">
        {briefing.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      <h3>🏆 The Scavenger Hunt</h3>
      {huntGroups.map((g) => (
        <div key={g.key}>
          <h4>{g.title}</h4>
          <ul className="hunt-print">
            {g.items.map((item, i) => (
              <li key={i}>
                <span className="box" aria-hidden="true">☐</span> {item.t}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h3>🎒 What to Bring</h3>
      <ul className="bring">
        {briefing.bring.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>

      <p className="sign-off">Good luck, crew. Headquarters believes in you. 🧭</p>

      <div className="btn-row no-print">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          ▶️ Start the mission
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          🖨️ Print mission sheet
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to options
        </button>
      </div>
    </article>
  );
}
