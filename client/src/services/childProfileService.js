const CHILD_PROFILES_URL = '/api/child-profiles'

export class ChildProfileServiceError extends Error {
  constructor(message, { status, body }) {
    super(message)
    this.name = 'ChildProfileServiceError'
    this.status = status
    this.body = body
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    // Preserve status details even when the error body is empty or invalid JSON.
    const body = await response.json().catch(() => null)

    throw new ChildProfileServiceError(`Request failed with status ${response.status}`, {
      status: response.status,
      body,
    })
  }

  return response.json()
}

export function fetchChildProfiles() {
  return fetch(CHILD_PROFILES_URL, { credentials: 'include' }).then(parseJsonResponse)
}

export function createChildProfile({ name, grammaticalGender, readingLevel, interests }) {
  return fetch(CHILD_PROFILES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, grammaticalGender, readingLevel, interests }),
  }).then(parseJsonResponse)
}

export function updateChildProfile(childId, updates) {
  return fetch(`${CHILD_PROFILES_URL}/${childId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  }).then(parseJsonResponse)
}
