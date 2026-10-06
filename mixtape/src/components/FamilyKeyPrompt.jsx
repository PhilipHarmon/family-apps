import { useState } from "react";

/**
 * Blocking prompt shown whenever no family key is available (or the last key
 * was rejected). Styled to match the app's cream card + terracotta look.
 */
export default function FamilyKeyPrompt({ onSave, error }) {
  const [key, setKey] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const k = key.trim();
    if (k) onSave(k);
  };

  return (
    <div className="key-overlay" role="dialog" aria-modal="true" aria-label="Enter the family key">
      <form className="key-card" onSubmit={submit}>
        <h2>🔑 One thing first…</h2>
        <p>
          Enter the <strong>family key</strong> to sync everyone's mixtapes.
          No key? Ask the head tape-dubber (you know who).
        </p>
        <input
          type="password"
          placeholder="Family key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
          aria-label="Family key"
        />
        {error && <p className="key-error">{error}</p>}
        <button type="submit">Save &amp; Spin ▶</button>
      </form>
    </div>
  );
}
