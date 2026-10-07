import { isDemoMode } from "./demoMode.js";
import { handleDemoRequest } from "./demoData.js";

/* Shared family API client — movie night talks to the family backend.
   Base URL comes from VITE_API_URL (no trailing slash); every request carries
   the x-family-key header. A 401 clears the saved key and signals the app to
   re-show the key prompt. */

const BASE = `${import.meta.env.VITE_API_URL}/api`;
const LS_FAMILY_KEY = "familyKey";

let authFailureHandler = null;
/** Register the callback the app uses to re-show the key prompt on 401. */
export function onAuthFailure(cb) {
  authFailureHandler = cb;
}

/** Key resolution: saved key first, then the build-time env key. */
export function getFamilyKey() {
  try {
    const saved = localStorage.getItem(LS_FAMILY_KEY);
    if (saved) return saved;
  } catch {
    /* storage unavailable */
  }
  return import.meta.env.VITE_FAMILY_KEY || "";
}

/** Persist the family key (the only thing we keep in localStorage). */
export function setFamilyKey(key) {
  try {
    localStorage.setItem(LS_FAMILY_KEY, key);
  } catch {
    /* storage unavailable */
  }
}

function handleUnauthorized() {
  try {
    localStorage.removeItem(LS_FAMILY_KEY);
  } catch {
    /* ignore */
  }
  if (authFailureHandler) authFailureHandler();
}

async function request(path, options = {}) {
  if (isDemoMode()) {
    const method = (options.method || 'GET').toUpperCase();
    let demoBody;
    try { demoBody = options.body ? JSON.parse(options.body) : undefined; } catch { demoBody = undefined; }
    return handleDemoRequest(method, path, demoBody);
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-family-key": getFamilyKey(),
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    const err = new Error("Couldn't reach the family server. Check your connection and try again.");
    err.cause = e;
    throw err;
  }

  if (res.status === 401) {
    handleUnauthorized();
    const err = new Error("That family key didn't work. Double-check it and try again.");
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    const err = new Error(
      `Family server hiccup (${res.status}${res.statusText ? ` ${res.statusText}` : ""})${
        detail ? ` — ${detail.slice(0, 160)}` : ""
      }`
    );
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
export const put = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });
export const del = (path) => request(path, { method: "DELETE" });
