import { useEffect, useRef, useState } from 'react';

/* Optional voice-note keepsake per passage. Records with MediaRecorder and
 * hands the parent a base64 data URL (stored on the passage as audioUrl),
 * so it rides along inside the normal JSON API — no file-upload endpoint
 * needed. iOS Safari has no in-browser speech *recognition*, which is why
 * the app instead shows a dictation tip next to the text box. */
const MAX_SECS = 120;

export default function AudioNote({ onChange }) {
  const [state, setState] = useState('idle'); // idle | recording | done | denied | unsupported
  const [secs, setSecs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const supported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const start = async () => {
    if (!supported || state === 'recording') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(typeof reader.result === 'string' ? reader.result : '');
        };
        reader.readAsDataURL(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setState('done');
      };
      rec.start();
      setSecs(0);
      setState('recording');
      timerRef.current = window.setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= MAX_SECS) {
            stop();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      stopTracks();
      setState('denied');
    }
  };

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  };

  const clear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSecs(0);
    setState('idle');
    onChange('');
  };

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  if (!supported) return null;

  return (
    <div className="audionote">
      {state === 'idle' && (
        <button type="button" className="btn btn-ghost" onClick={start}>
          🎙️ Record a voice note
        </button>
      )}
      {state === 'recording' && (
        <div className="audionote-rec">
          <span className="rec-dot" aria-hidden="true" />
          <span className="rec-time">{mmss}</span>
          <button type="button" className="btn btn-ghost" onClick={stop}>
            ⏹ Stop
          </button>
        </div>
      )}
      {state === 'done' && (
        <div className="audionote-done">
          {previewUrl && <audio controls src={previewUrl} className="audionote-player" />}
          <button type="button" className="btn btn-ghost" onClick={start}>
            ↺ Re-record
          </button>
          <button type="button" className="btn btn-ghost" onClick={clear}>
            ✕ Remove
          </button>
        </div>
      )}
      {state === 'denied' && (
        <p className="audionote-hint">
          🎙️ Microphone was blocked — allow it in the browser to record voice notes, or just type the passage.
        </p>
      )}
    </div>
  );
}
