import { useState } from 'react';

// Blocking key prompt, styled to match the app's design language
// (warm cream card, terracotta button, Georgia heading).
export default function FamilyKeyPrompt({ onSave }) {
  const [key, setKey] = useState('');

  function submit(e) {
    e.preventDefault();
    const k = key.trim();
    if (k) onSave(k);
  }

  return (
    <div className="key-overlay">
      <div className="key-card card">
        <span className="key-emoji" aria-hidden="true">🔑</span>
        <h2>One key, one family</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Enter the family key to sync everyone&rsquo;s trivia night &mdash;
          shared questions, shared Hall of Fame, same bragging rights.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="family-key">Family key</label>
          <input
            id="family-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Ask the family key-keeper"
            autoComplete="off"
            autoFocus
          />
          <div style={{ marginTop: 18 }}>
            <button type="submit" className="btn-primary" disabled={!key.trim()}>
              💾 Save key &amp; play
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
