const AUTH_BASE_URL = '/api/auth'

export class AuthServiceError extends Error {
  constructor(message, { status, body }) {
    super(message)
    this.name = 'AuthServiceError'
    this.status = status
    this.body = body
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    // Preserve status details even when the error body is empty or invalid JSON.
    const body = await response.json().catch(() => null)

    throw new AuthServiceError(`Request failed with status ${response.status}`, {
      status: response.status,
      body,
    })
  }

  return response.json()
}

export function login({ email, password }) {
  return fetch(`${AUTH_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The auth cookie is HttpOnly and cross-origin in production; this is
    // what makes the browser send/store it at all, even though the Vite
    // dev proxy makes it same-origin in local dev regardless.
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  }).then(parseJsonResponse)
}

// No `credentials: 'include'` here — registration doesn't set or need a
// cookie (only /login does); a successful registration still requires a
// separate login.
export function register({ email, password }) {
  return fetch(`${AUTH_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(parseJsonResponse)
}
