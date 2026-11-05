import Avatar from './Avatar.jsx';

// Live mission mode: the hunt as big, tappable rows for a parent holding a
// phone in a park, plus the crew's roles as a reminder strip.
export default function Live({ briefing, checked, onToggle, onComplete, onAbandon }) {
  const groups = [
    { key: 'easy', title: '🌟 Easy Finds — for the littlest explorers', items: briefing.hunt.easy },
    { key: 'standard', title: '🔍 The Hunt', items: briefing.hunt.standard },
    { key: 'expert', title: '⭐ Expert Challenges', items: briefing.hunt.expert },
  ].filter((g) => g.items.length);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const found = checked.length;
  const allFound = found >= total && total > 0;

  return (
    <section>
      <h2 className="screen-title">{briefing.title}</h2>

      <div className="crew-strip">
        {briefing.roles.map((r) => (
          <span className="crew-chip" key={r.personId} title={`${r.name}: ${r.roleTitle}`}>
            <Avatar person={r} size={26} /> {r.emoji} {r.roleTitle}
          </span>
        ))}
      </div>

      <div className="progress-wrap" aria-label={`${found} of ${total} found`}>
        <div className="progress-bar" style={{ width: `${total ? (found / total) * 100 : 0}%` }} />
      </div>
      <p className="progress-label">
        {found} of {total} found {allFound ? '— that’s everything! 🎉' : ''}
      </p>

      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="hunt-group-title">{g.title}</h3>
          <div className="hunt-live">
            {g.items.map((item) => {
              const isOn = checked.includes(item.t);
              return (
                <button
                  type="button"
                  key={item.t}
                  className={`hunt-row${isOn ? ' on' : ''}`}
                  onClick={() => onToggle(item.t)}
                  aria-pressed={isOn}
                >
                  <span className="hunt-check" aria-hidden="true">{isOn ? '✅' : '⬜'}</span>
                  <span>{item.t}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="btn-row">
        <button type="button" className="btn btn-primary btn-big" disabled={!allFound} onClick={onComplete}>
          🏆 Mission Complete!
        </button>
        {!allFound && found > 0 && (
          <button type="button" className="btn btn-ghost" onClick={onComplete}>
            Wrap up anyway ({found}/{total})
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onAbandon}>
          Save &amp; pause this mission
        </button>
      </div>
      {!allFound && <p className="hint">Mission Complete unlocks when every item is checked off.</p>}
    </section>
  );
}
