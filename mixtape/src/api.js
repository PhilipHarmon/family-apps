/**
 * Shared family mixtape API client.
 *
 * Base URL comes from VITE_API_URL (no trailing slash), defaulting to a local
 * dev server. Every request carries the family key in the `x-family-key`
 * header. Key resolution: localStorage 'familyKey' first, then
 * import.meta.env.VITE_FAMILY_KEY.
 *
 * On a 401 the stored key is cleared and a 'family-key-invalid' event is
 * dispatched so the app can re-show the key prompt.
 */

const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

export const FAMILY_KEY_STORAGE = "familyKey";

export function getFamilyKey() {
  try {
    const stored = localStorage.getItem(FAMILY_KEY_STORAGE);
    if (stored) return stored;
  } catch {
    /* storage unavailable — fall through to the env var */
  }
  return import.meta.env.VITE_FAMILY_KEY || null;
}

export function saveFamilyKey(key) {
  try {
    localStorage.setItem(FAMILY_KEY_STORAGE, key);
  } catch {
    /* storage unavailable — the key lives in memory only */
  }
}

export function clearFamilyKey() {
  try {
    localStorage.removeItem(FAMILY_KEY_STORAGE);
  } catch {
    /* nothing to clear */
  }
}

function currentKey() {
  const key = getFamilyKey();
  if (!key) {
    throw new Error("No family key — enter it to sync everyone's mixtapes.");
  }
  return key;
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-family-key": currentKey(),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (networkError) {
    const err = new Error(
      "Can't reach the family mixtape shelf — check your connection."
    );
    err.cause = networkError;
    throw err;
  }

  if (res.status === 401) {
    clearFamilyKey();
    window.dispatchEvent(new CustomEvent("family-key-invalid"));
    const err = new Error("That family key didn't work. Try entering it again.");
    err.status = 401;
    err.unauthorized = true;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Mixtape shelf hiccup (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`
    );
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const get = (path) => request("GET", path);
export const post = (path, body) => request("POST", path, body);
export const put = (path, body) => request("PUT", path, body);
export const del = (path) => request("DELETE", path);

/**
 * Map an API tape ({_id, ...}) onto the app's tape shape ({id, ...}).
 * Track shape ({title, artist}) is preserved exactly.
 */
export function normalizeTape(t) {
  if (!t || typeof t !== "object") return null;
  const id = t._id ?? t.id ?? null;
  if (!id) return null;
  return {
    id,
    title: t.title || "Untitled Tape",
    sideA: Array.isArray(t.sideA) ? t.sideA : [],
    sideB: Array.isArray(t.sideB) ? t.sideB : [],
    createdAt: t.createdAt ?? Date.now(),
  };
}
