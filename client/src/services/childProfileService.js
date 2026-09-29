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

export function fetchChildProgress(childId) {
  return fetch(`${CHILD_PROFILES_URL}/${childId}/progress`, { credentials: 'include' }).then(
    parseJsonResponse,
  )
}

export function updateChildProfile(childId, updates) {
  return fetch(`${CHILD_PROFILES_URL}/${childId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  }).then(parseJsonResponse)
}

// Separate from updateChildProfile: choosing an avatar is a child action and must
// keep working without a parent-zone session.
export function updateChildAvatar(childId, avatarId) {
  return fetch(`${CHILD_PROFILES_URL}/${childId}/avatar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ avatarId }),
  }).then(parseJsonResponse)
}

// Soft delete server-side (see ChildSchema.js's isArchived) — named
// "archive" here to stay honest about that, even though the UI calls it
// deletion (see ParentZonePage.jsx).
export function archiveChildProfile(childId) {
  return fetch(`${CHILD_PROFILES_URL}/${childId}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then(parseJsonResponse)
}
