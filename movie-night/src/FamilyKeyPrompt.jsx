import { useState } from "react";

/* Blocking prompt for the shared family key — styled like the rest of the app. */
export default function FamilyKeyPrompt({ onSave }) {
  const [value, setValue] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const key = value.trim();
    if (key) onSave(key);
  };

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="Enter family key">
      <div className="picker-card">
        <p className="picker-kicker">🔑 Family sync</p>
        <h2 className="picker-title">One key for the whole family</h2>
        <p className="picker-sub">
          Enter the family key to sync everyone's movie night — one shared list on every phone.
        </p>
        <form className="key-form" onSubmit={submit}>
          <input
            className="field"
            type="password"
            placeholder="Family key"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <button className="btn primary" type="submit" disabled={!value.trim()}>
            Save key
          </button>
        </form>
      </div>
    </div>
  );
}
