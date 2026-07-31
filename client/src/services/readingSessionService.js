const READING_SESSIONS_BASE_URL = '/api/reading-sessions'

export class ReadingSessionServiceError extends Error {
  constructor(message, { status, body }) {
    super(message)
    this.name = 'ReadingSessionServiceError'
    this.status = status
    this.body = body
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    // Preserve status details even when the error body is empty or invalid JSON.
    const body = await response.json().catch(() => null)

    throw new ReadingSessionServiceError(`Request failed with status ${response.status}`, {
      status: response.status,
      body,
    })
  }

  return response.json()
}

export function fetchReadingExercise(childId) {
  return fetch(`${READING_SESSIONS_BASE_URL}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId }),
  }).then(parseJsonResponse)
}

export function submitAnswer({ sessionId, answerText }) {
  return fetch(`${READING_SESSIONS_BASE_URL}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answerText }),
  }).then(parseJsonResponse)
}

export function fetchNextQuestion(sessionId) {
  return fetch(`${READING_SESSIONS_BASE_URL}/next-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).then(parseJsonResponse)
}
