import { useState } from 'react'

// Blocking prompt for the shared family key. Styled to match the app:
// cream card, terracotta button, Georgia heading.
export default function FamilyKeyPrompt({ onSave, rejectedNote }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const v = value.trim()
    if (!v) {
      setError('Type the key first — then we can start syncing.')
      return
    }
    onSave(v)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Family key">
      <form className="modal" onSubmit={submit}>
        <h2>🔑 Family key, please</h2>
        <p className="modal-sub">Enter the family key to sync everyone&apos;s photo journal.</p>
        {rejectedNote && <p className="key-note">{rejectedNote}</p>}
        <div className="field">
          <label htmlFor="family-key">Family key</label>
          <input
            id="family-key"
            type="password"
            autoComplete="off"
            placeholder="the shared family key"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
          />
        </div>
        {error && <p className="key-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-primary" type="submit">
            💾 Save key
          </button>
        </div>
      </form>
    </div>
  )
}
