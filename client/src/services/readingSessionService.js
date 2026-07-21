const READING_SESSIONS_BASE_URL = '/api/reading-sessions'

async function parseJsonResponse(response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
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
