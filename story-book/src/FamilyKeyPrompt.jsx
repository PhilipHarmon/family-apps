import { useState } from 'react';

/* Blocking key prompt — styled to match Story Book (twilight card, gold button). */
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
        <div className="key-emoji" aria-hidden="true">📖</div>
        <h1>Family key</h1>
        <p>Enter the family key to save everyone's stories.</p>
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
            Open the book
          </button>
        </form>
      </div>
    </div>
  );
}
