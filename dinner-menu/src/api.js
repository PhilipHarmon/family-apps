/* Shared family API client.
 *
 * Base URL comes from VITE_API_URL (no trailing slash), e.g.
 * https://family-api.onrender.com locally http://localhost:5000.
 * Every request except GET /api/health carries the x-family-key header.
 */

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BASE = `${API_URL}/api`;

const KEY_STORAGE = 'familyKey';

/* Key resolution: localStorage first, then VITE_FAMILY_KEY env fallback. */
export function getFamilyKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || import.meta.env.VITE_FAMILY_KEY || '';
  } catch {
    return import.meta.env.VITE_FAMILY_KEY || '';
  }
}

export function setFamilyKey(key) {
  try {
    localStorage.setItem(KEY_STORAGE, key);
  } catch {
    /* storage unavailable — the key still works for this session */
  }
}

export function clearFamilyKey() {
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

/* Rich error carrying the HTTP status. `unauthorized` is true on 401,
 * which tells the app to clear the key and re-show the key prompt. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.unauthorized = status === 401;
  }
}

async function request(method, path, body) {
  const key = getFamilyKey();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'x-family-key': key } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the family server. Check your connection and try again.');
  }

  if (res.status === 401) {
    clearFamilyKey();
    throw new ApiError(401, 'That family key didn\u2019t work. Please enter it again.');
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    throw new ApiError(
      res.status,
      `The family server returned an error (status ${res.status})${detail ? `: ${detail}` : '.'}`
    );
  }

  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export const get = (path) => request('GET', path);
export const post = (path, body) => request('POST', path, body);
export const put = (path, body) => request('PUT', path, body);
export const del = (path) => request('DELETE', path);
