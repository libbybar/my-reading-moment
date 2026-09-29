import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  streamReadingExercise,
  submitAnswer,
  fetchNextQuestion,
  skipSession,
  ReadingSessionServiceError,
} from '../../src/services/readingSessionService'

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Minimal ReadableStream-shaped response for streamReadingExercise's NDJSON parser.
function fakeStreamingResponse(events, { ok = true, status = 200 } = {}) {
  const encoder = new TextEncoder()
  const lines = events.map((event) => `${JSON.stringify(event)}\n`)
  let index = 0

  return {
    ok,
    status,
    body: {
      getReader: () => ({
        read: () => {
          if (index >= lines.length) {
            return Promise.resolve({ done: true, value: undefined })
          }

          const value = encoder.encode(lines[index])
          index += 1

          return Promise.resolve({ done: false, value })
        },
      }),
    },
  }
}

function collectUpdates(stream) {
  const updates = []
  stream.subscribe((state) => updates.push(state))
  return updates
}

describe('readingSessionService', () => {
  describe('streamReadingExercise', () => {
    it('sends a POST request with the childId in the body', async () => {
      globalThis.fetch.mockResolvedValue(fakeStreamingResponse([{ type: 'done', sessionId: 's1' }]))

      streamReadingExercise('test-child-profile-1')

      await vi.waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/reading-sessions/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: 'test-child-profile-1' }),
        })
      })
    })

    it('delivers title and chunk events incrementally, then a terminal done event', async () => {
      globalThis.fetch.mockResolvedValue(
        fakeStreamingResponse([
          { type: 'title', title: 'כותרת' },
          { type: 'chunk', text: 'שלום ' },
          { type: 'chunk', text: 'עולם' },
          {
            type: 'done',
            title: 'כותרת',
            story: 'שלום עולם',
            passageId: 'p1',
            sessionId: 's1',
            question: null,
            grammaticalGender: 'female',
          },
        ]),
      )

      const updates = collectUpdates(streamReadingExercise('test-child-profile-1'))

      await vi.waitFor(() => {
        expect(updates[updates.length - 1].status).toBe('done')
      })

      expect(updates[0]).toMatchObject({ status: 'streaming', title: null, story: '' })
      expect(updates[1]).toMatchObject({ title: 'כותרת', story: '' })
      expect(updates[2]).toMatchObject({ story: 'שלום ' })
      expect(updates[3]).toMatchObject({ story: 'שלום עולם' })

      const final = updates[updates.length - 1]
      expect(final.status).toBe('done')
      expect(final.meta).toEqual({
        type: 'done',
        title: 'כותרת',
        story: 'שלום עולם',
        passageId: 'p1',
        sessionId: 's1',
        question: null,
        grammaticalGender: 'female',
      })
    })

    it('replays already-arrived state to a subscriber that attaches late', async () => {
      globalThis.fetch.mockResolvedValue(
        fakeStreamingResponse([
          { type: 'chunk', text: 'חלק ראשון' },
          { type: 'done', title: 't', story: 'חלק ראשון', sessionId: 's1' },
        ]),
      )

      const stream = streamReadingExercise('test-child-profile-1')

      await vi.waitFor(() => {
        const probe = []
        const unsubscribe = stream.subscribe((state) => probe.push(state))
        unsubscribe()
        expect(probe[0].status).toBe('done')
      })

      const lateUpdates = []
      stream.subscribe((state) => lateUpdates.push(state))

      expect(lateUpdates).toHaveLength(1)
      expect(lateUpdates[0].status).toBe('done')
      expect(lateUpdates[0].story).toBe('חלק ראשון')
    })

    it('reports a structured error event when the response is not ok (the early, pre-stream failure shape)', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'busy' }),
      })

      const updates = collectUpdates(streamReadingExercise('test-child-profile-1'))

      await vi.waitFor(() => {
        expect(updates[updates.length - 1].status).toBe('error')
      })

      const final = updates[updates.length - 1]
      expect(final.error).toBeInstanceOf(ReadingSessionServiceError)
      expect(final.error.status).toBe(409)
      expect(final.error.body).toEqual({ error: 'busy' })
    })

    it('reports an error state for an in-band {type:"error"} event mid-stream', async () => {
      globalThis.fetch.mockResolvedValue(
        fakeStreamingResponse([
          { type: 'title', title: 'כותרת' },
          { type: 'error', error: 'Failed to generate a reading question', errorCode: 'reading_session_preview_failed' },
        ]),
      )

      const updates = collectUpdates(streamReadingExercise('test-child-profile-1'))

      await vi.waitFor(() => {
        expect(updates[updates.length - 1].status).toBe('error')
      })

      expect(updates[updates.length - 1].error).toEqual({
        type: 'error',
        error: 'Failed to generate a reading question',
        errorCode: 'reading_session_preview_failed',
      })
    })
  })

  describe('submitAnswer', () => {
    it('sends a POST request with sessionId and answerText in the body', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

      await submitAnswer({ sessionId: 'session-1', answerText: 'some answer' })

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/reading-sessions/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-1', answerText: 'some answer' }),
      })
    })

    it('resolves with the parsed JSON body on success', async () => {
      const evaluation = { questionId: 'test-question-1', isCorrect: true, feedbackType: 'correct' }
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(evaluation) })

      const result = await submitAnswer({ sessionId: 'session-1', answerText: 'some answer' })

      expect(result).toEqual(evaluation)
    })

    it('rejects with a structured error when the response is not ok', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Session not found' }),
      })

      await expect(
        submitAnswer({ sessionId: 'unknown', answerText: 'some answer' }),
      ).rejects.toMatchObject({
        name: 'ReadingSessionServiceError',
        status: 404,
        body: { error: 'Session not found' },
        message: expect.any(String),
      })
    })
  })

  describe('fetchNextQuestion', () => {
    it('sends a POST request with only sessionId in the body', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

      await fetchNextQuestion('session-1')

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/reading-sessions/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-1' }),
      })
    })

    it('resolves with a safe question object on success', async () => {
      const question = { id: 'test-question-2', passageId: 'test-passage-1', prompt: 'Prompt?' }
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ question }),
      })

      const result = await fetchNextQuestion('session-1')

      expect(result).toEqual({ question })
    })

    it('resolves with a null question for the temporary mock fallback', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ question: null }),
      })

      const result = await fetchNextQuestion('session-1')

      expect(result).toEqual({ question: null })
    })

    it('rejects with a structured error when the response is not ok', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'boom' }),
      })

      await expect(fetchNextQuestion('session-1')).rejects.toMatchObject({
        name: 'ReadingSessionServiceError',
        status: 500,
        body: { error: 'boom' },
        message: expect.any(String),
      })
    })
  })

  describe('skipSession', () => {
    it('sends a POST request with only sessionId in the body', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ skipped: true }) })

      await skipSession('session-1')

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/reading-sessions/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-1' }),
      })
    })

    it('resolves with the parsed JSON body on success', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ skipped: true }) })

      const result = await skipSession('session-1')

      expect(result).toEqual({ skipped: true })
    })

    it('rejects with a structured error when the response is not ok', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Session busy' }),
      })

      await expect(skipSession('session-1')).rejects.toMatchObject({
        name: 'ReadingSessionServiceError',
        status: 409,
        body: { error: 'Session busy' },
        message: expect.any(String),
      })
    })
  })
})
