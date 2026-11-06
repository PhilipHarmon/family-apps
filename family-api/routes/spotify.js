const express = require('express');

const router = express.Router();

// Client Credentials token cache (module memory). Tokens are good for an
// hour; we refresh with a 60s skew so a stale token is never handed out.
let cachedToken = null;
let cachedExpiresAt = 0;

const NOT_CONFIGURED = "Spotify search isn't configured on the server yet.";
const SPOTIFY_DOWN = "Spotify didn't answer — try again in a bit.";

async function getAppToken() {
  if (cachedToken && Date.now() < cachedExpiresAt) return cachedToken;

  const clientId = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return null;

  // HTTP Basic auth with the app credentials (never logged or returned).
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('token exchange returned no token');
  const ttlMs = Math.max(0, (Number(data.expires_in) || 3600) - 60) * 1000;
  cachedToken = data.access_token;
  cachedExpiresAt = Date.now() + ttlMs;
  return cachedToken;
}

// Smallest album-art image Spotify lists, or null.
function smallImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  return images[images.length - 1].url || null;
}

// GET /spotify/search?q=... — search Spotify's catalog for tracks.
router.get('/spotify/search', async (req, res) => {
  const clientId = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: NOT_CONFIGURED });
  }

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Add a search term first.' });
  const query = q.slice(0, 120);

  let token;
  try {
    token = await getAppToken();
  } catch (err) {
    console.error('spotify token exchange failed:', err.message);
    return res.status(502).json({ error: SPOTIFY_DOWN });
  }
  if (!token) return res.status(503).json({ error: NOT_CONFIGURED });

  let data;
  try {
    const url =
      'https://api.spotify.com/v1/search?' +
      new URLSearchParams({ q: query, type: 'track', limit: '8' });
    const apiRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!apiRes.ok) throw new Error(`spotify search failed: ${apiRes.status}`);
    data = await apiRes.json();
  } catch (err) {
    console.error('spotify search failed:', err.message);
    return res.status(502).json({ error: SPOTIFY_DOWN });
  }

  const items = (data && data.tracks && data.tracks.items) || [];
  res.json(
    items.map((t) => ({
      id: t.id,
      name: t.name,
      artists: (t.artists || []).map((a) => a.name).join(', '),
      album: (t.album && t.album.name) || '',
      image: smallImage(t.album && t.album.images),
      url: (t.external_urls && t.external_urls.spotify) || `https://open.spotify.com/track/${t.id}`,
      uri: t.uri,
    })),
  );
});

module.exports = router;
