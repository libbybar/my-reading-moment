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

// A ReadableStream can be consumed once; the pub/sub wrapper lets StrictMode's
// remount reuse the same /preview stream instead of creating a second session.
export function streamReadingExercise(childId) {
  const listeners = new Set()
  let state = { status: 'streaming', title: null, story: '', meta: null, error: null }

  function setState(patch) {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener(state))
  }

  function handleEvent(event) {
    if (event.type === 'title') {
      setState({ title: event.title })
    } else if (event.type === 'chunk') {
      setState({ story: state.story + event.text })
    } else if (event.type === 'done') {
      setState({ status: 'done', meta: event })
    } else if (event.type === 'error') {
      setState({ status: 'error', error: event })
    }
  }

  async function run() {
    try {
      const response = await fetch(`${READING_SESSIONS_BASE_URL}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      })

      if (!response.ok) {
        // After /preview commits to streaming, failures arrive as NDJSON error events.
        await parseJsonResponse(response)
        return
      }

      if (!response.body) {
        throw new ReadingSessionServiceError('Streaming is not supported in this environment', {
          status: response.status,
          body: null,
        })
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { value, done } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop()

        lines.filter((line) => line.length > 0).forEach((line) => handleEvent(JSON.parse(line)))
      }
    } catch (error) {
      setState({ status: 'error', error })
    }
  }

  run()

  return {
    subscribe(listener) {
      listeners.add(listener)
      listener(state)

      return () => listeners.delete(listener)
    },
  }
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

export function fetchQuestion(sessionId) {
  return fetch(`${READING_SESSIONS_BASE_URL}/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).then(parseJsonResponse)
}

export function skipSession(sessionId) {
  return fetch(`${READING_SESSIONS_BASE_URL}/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).then(parseJsonResponse)
}
