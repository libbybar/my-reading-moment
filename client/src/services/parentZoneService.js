const PARENT_ZONE_URL = '/api/parent-zone'

export const PARENT_ZONE_ERROR_CODES = {
  locked: 'parent_zone_locked',
  invalidCredentials: 'parent_zone_invalid_credentials',
  tooManyAttempts: 'parent_zone_too_many_attempts',
}

export class ParentZoneServiceError extends Error {
  constructor(message, { status, body }) {
    super(message)
    this.name = 'ParentZoneServiceError'
    this.status = status
    this.body = body
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    // Preserve status details even when the error body is empty or invalid JSON.
    const body = await response.json().catch(() => null)

    throw new ParentZoneServiceError(`Request failed with status ${response.status}`, {
      status: response.status,
      body,
    })
  }

  return response.json()
}

function postJson(path, body) {
  return fetch(`${PARENT_ZONE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(parseJsonResponse)
}

export function hasErrorCode(error, errorCode) {
  return error?.body?.errorCode === errorCode
}

// Works for errors from any service: only the server's errorCode identifies an expired session.
export function isParentZoneLockedError(error) {
  return error?.status === 403 && hasErrorCode(error, PARENT_ZONE_ERROR_CODES.locked)
}

export function fetchParentZoneStatus() {
  return fetch(`${PARENT_ZONE_URL}/status`, { credentials: 'include' }).then(parseJsonResponse)
}

export function unlockParentZone(pin) {
  return postJson('/unlock', { pin })
}

export function lockParentZone() {
  return fetch(`${PARENT_ZONE_URL}/lock`, { method: 'POST', credentials: 'include' }).then(
    parseJsonResponse,
  )
}

// Exactly one of currentPin or password proves the change, including the first PIN.
export function setParentPin({ newPin, currentPin, password }) {
  return postJson('/pin', { newPin, currentPin, password })
}
