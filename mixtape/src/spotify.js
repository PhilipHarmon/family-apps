/**
 * Spotify integration for the Family Mixtape app.
 *
 * Everything here runs in the browser — no backend changes, no secrets.
 * Auth uses OAuth Authorization Code with PKCE (the modern SPA-safe flow):
 * the user logs into Spotify once, and the app gets a token that can search
 * tracks and create playlists ON THEIR OWN account.
 *
 * Setup (one time, by Philip):
 *   1. Create a free app at https://developer.spotify.com/dashboard
 *   2. Add this site's URL (with trailing slash, e.g.
 *      https://mixtape.onrender.com/) as a Redirect URI
 *   3. Set VITE_SPOTIFY_CLIENT_ID to the app's Client ID and redeploy
 */

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
const TOKEN_KEY = "spotify:tokens";
const SCOPES = "user-read-private playlist-modify-public playlist-modify-private";

export function isSpotifyConfigured() {
  return Boolean(CLIENT_ID);
}

function redirectUri() {
  return window.location.origin + window.location.pathname;
}

/* ---------------- PKCE helpers ---------------- */

function randomHex(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function codeChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* ---------------- Auth ---------------- */

export async function startSpotifyLogin(returnToTapeId) {
  const verifier = randomHex(64);
  const challenge = await codeChallenge(verifier);
  // Random CSRF state; the tape to restore lives separately in session
  // storage so the state value itself carries no meaning to an attacker.
  const state = randomHex(16);
  try {
    sessionStorage.setItem("spotify:verifier", verifier);
    sessionStorage.setItem(
      "spotify:oauth",
      JSON.stringify({ state, returnTo: returnToTapeId || null })
    );
  } catch {
    /* storage unavailable — the callback will fail gracefully */
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

/**
 * Called once on app boot. If the URL carries an OAuth ?code=, validates the
 * state against what we stored, exchanges the code for tokens, scrubs the
 * URL, and returns { returnTo } (the tape id to restore, or null).
 * Returns null when there's no code to handle.
 */
export async function handleSpotifyCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (!code && !oauthError) return null;
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  window.history.replaceState({}, "", url);
  if (oauthError || !code) return { error: oauthError || "login cancelled" };
  let oauth = null;
  let verifier = null;
  try {
    oauth = JSON.parse(sessionStorage.getItem("spotify:oauth") || "null");
    verifier = sessionStorage.getItem("spotify:verifier");
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem("spotify:oauth");
  } catch {
    /* ignore */
  }
  if (!oauth || !returnedState || oauth.state !== returnedState) {
    return { error: "the login didn't come back right — try again" };
  }
  if (!verifier) return { error: "lost the login handshake — try again" };
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });
  try {
    sessionStorage.removeItem("spotify:verifier");
  } catch {
    /* ignore */
  }
  if (!res.ok) return { error: "Spotify wouldn't hand over the token" };
  saveTokens(await res.json());
  return { returnTo: oauth.returnTo || null };
}

function saveTokens(tok) {
  const record = {
    access: tok.access_token,
    refresh: tok.refresh_token || null,
    expiresAt: Date.now() + (tok.expires_in || 3600) * 1000 - 60_000,
  };
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — token lives for this session only */
  }
}

function readTokens() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isSpotifyConnected() {
  return Boolean(readTokens()?.access);
}

export function disconnectSpotify() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function refreshTokens(record) {
  if (!record.refresh) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: record.refresh,
    }),
  });
  if (!res.ok) return null;
  const tok = await res.json();
  // Spotify rotates refresh tokens — keep the old one if none is returned.
  if (!tok.refresh_token) tok.refresh_token = record.refresh;
  saveTokens(tok);
  return tok.access_token;
}

export async function getAccessToken() {
  const record = readTokens();
  if (!record?.access) return null;
  if (Date.now() < record.expiresAt) return record.access;
  return refreshTokens(record);
}

/* ---------------- Spotify Web API ---------------- */

async function api(path, { method = "GET", body } = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("not connected");
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    disconnectSpotify();
    throw new Error("Spotify session expired — connect again");
  }
  if (!res.ok) throw new Error(`Spotify said no (${res.status})`);
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Find the best Spotify match for a mixtape track. Returns
 * { id, uri, name, artist, image } or null when nothing sensible matches.
 */
export async function searchTrack(title, artist) {
  const q = `track:"${title}" artist:"${artist}"`;
  const data = await api(
    `/search?${new URLSearchParams({ q, type: "track", limit: "5" })}`
  );
  const items = data?.tracks?.items || [];
  if (items.length === 0) return null;
  const t = items[0];
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artist: (t.artists || []).map((a) => a.name).join(", "),
    image: t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || null,
  };
}

export function playlistBlurb(tapeTitle) {
  return (
    `Dubbed with \u{1F4FC} Family Mixtape \u2014 "${tapeTitle}". ` +
    `Side A, Side B, and a killer closer. Never skip the closer.`
  );
}

/**
 * Create a playlist named after the tape (with the blurb in its
 * description) and fill it with the matched tracks, in tape order.
 * Returns { id, url }.
 */
export async function createPlaylistWithTracks(tapeTitle, trackUris) {
  const me = await api("/me");
  const playlist = await api(`/users/${me.id}/playlists`, {
    method: "POST",
    body: {
      name: tapeTitle,
      description: playlistBlurb(tapeTitle),
      public: false,
    },
  });
  if (trackUris.length > 0) {
    // Spotify accepts up to 100 URIs per call — tapes are never that long,
    // but chunk defensively anyway.
    for (let i = 0; i < trackUris.length; i += 100) {
      await api(`/playlists/${playlist.id}/tracks`, {
        method: "POST",
        body: { uris: trackUris.slice(i, i + 100) },
      });
    }
  }
  return {
    id: playlist.id,
    url: playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`,
  };
}
