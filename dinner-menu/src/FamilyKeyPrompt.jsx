import { useState } from 'react';

/* Blocking key prompt — styled to match the app (cream card, terracotta
 * button, Georgia heading). Shown whenever no family key is available. */
export default function FamilyKeyPrompt({ error, onSave }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    onSave(key);
  };

  return (
    <div className="center-screen">
      <div className="center-card">
        <h1>🔑 Family key</h1>
        <p>Enter the family key to sync everyone's dinners.</p>
        {error && <p className="key-error">{error}</p>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="family-key">Family key</label>
            <input
              id="family-key"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ask Philip for the key"
              autoComplete="off"
              autoFocus
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={!value.trim()}>
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
