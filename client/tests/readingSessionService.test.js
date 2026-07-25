import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchReadingExercise,
  submitAnswer,
  fetchNextQuestion,
  ReadingSessionServiceError,
} from '../src/services/readingSessionService'

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readingSessionService', () => {
  describe('fetchReadingExercise', () => {
    it('sends a POST request with the childId in the body', async () => {
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

      await fetchReadingExercise('test-child-profile-1')

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/reading-sessions/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: 'test-child-profile-1' }),
      })
    })

    it('resolves with the parsed JSON body on success', async () => {
      const exercise = { title: 'הקסם בספרייה', sessionId: 'session-1' }
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(exercise) })

      const result = await fetchReadingExercise('test-child-profile-1')

      expect(result).toEqual(exercise)
    })

    it('rejects with a structured error when the response is not ok', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'boom' }),
      })

      await expect(fetchReadingExercise('test-child-profile-1')).rejects.toMatchObject({
        name: 'ReadingSessionServiceError',
        status: 500,
        body: { error: 'boom' },
        message: expect.any(String),
      })
    })

    it('handles a non-JSON error response safely without hiding the HTTP status', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('invalid json')),
      })

      let caughtError

      try {
        await fetchReadingExercise('test-child-profile-1')
      } catch (thrownError) {
        caughtError = thrownError
      }

      expect(caughtError).toBeInstanceOf(ReadingSessionServiceError)
      expect(caughtError.status).toBe(502)
      expect(caughtError.body).toBeNull()
      expect(caughtError.message).toEqual(expect.any(String))
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
})
