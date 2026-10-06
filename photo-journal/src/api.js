// Shared family API client for One Day, One Photo.
// Base URL: ${import.meta.env.VITE_API_URL}/api (VITE_API_URL has no trailing slash,
// e.g. https://family-api.onrender.com; locally http://localhost:5000)

const BASE_URL = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`

export const FAMILY_KEY_STORAGE = 'familyKey'

// Key resolution: localStorage 'familyKey' first, else the VITE_FAMILY_KEY env var.
export function getFamilyKey() {
  try {
    const stored = localStorage.getItem(FAMILY_KEY_STORAGE)
    if (stored) return stored
  } catch {
    // storage unavailable — fall through to env
  }
  return import.meta.env.VITE_FAMILY_KEY || ''
}

function withKey(key, init = {}) {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-family-key': key,
      ...(init.headers || {}),
    },
  }
}

async function request(path, key, init = {}) {
  const res = await fetch(`${BASE_URL}${path}`, withKey(key, init))

  if (res.status === 401) {
    // Wrong or missing key: clear the stored key so the app re-shows the prompt.
    try {
      localStorage.removeItem(FAMILY_KEY_STORAGE)
    } catch {
      // ignore
    }
    const err = new Error('That family key didn\'t work — try entering it again.')
    err.status = 401
    err.unauthorized = true
    throw err
  }

  if (!res.ok) {
    const err = new Error(
      `The photo journal server answered with ${res.status} ${res.statusText || 'an error'}.`
    )
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  list(key) {
    return request('/photos', key)
  },
  create(key, { date, imageUrl, caption }) {
    return request('/photos', key, {
      method: 'POST',
      body: JSON.stringify({ date, imageUrl, caption }),
    })
  },
  update(key, id, { date, imageUrl, caption }) {
    return request(`/photos/${id}`, key, {
      method: 'PUT',
      body: JSON.stringify({ date, imageUrl, caption }),
    })
  },
  remove(key, id) {
    return request(`/photos/${id}`, key, { method: 'DELETE' })
  },
}
