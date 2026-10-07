import { isDemoMode } from './demoMode.js';
import { handleDemoRequest } from './demoData.js';

// Shared API client for the family apps.
// Base: `${import.meta.env.VITE_API_URL}/api` (no trailing slash on VITE_API_URL).
// Every request carries `x-family-key`. A 401 clears the stored key and signals
// the app to re-show the family-key prompt.

const BASE = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')}/api`;

function getKey() {
  return localStorage.getItem('familyKey') || import.meta.env.VITE_FAMILY_KEY || '';
}

async function request(path, { method = 'GET', body } = {}) {
  if (isDemoMode()) {
    let demoBody = body;
    if (typeof demoBody === 'string') {
      try { demoBody = JSON.parse(demoBody); } catch { demoBody = undefined; }
    }
    return handleDemoRequest(method, path, demoBody);
  }

  const headers = { 'Content-Type': 'application/json' };
  const key = getKey();
  if (key) headers['x-family-key'] = key;

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      `Couldn't reach the family trivia server. Check your connection and try again. (${err.message || 'network error'})`
    );
  }

  if (res.status === 401) {
    localStorage.removeItem('familyKey');
    window.dispatchEvent(new CustomEvent('family-key-invalid'));
    const err = new Error('That family key didn\u2019t work. Please enter it again.');
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(
      `Family trivia server error (HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ''}`
    );
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (res.status === 204 || !contentType.includes('application/json')) return null;
  return res.json();
}

export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: 'POST', body });
export const put = (path, body) => request(path, { method: 'PUT', body });
export const del = (path) => request(path, { method: 'DELETE' });
