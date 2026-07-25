import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import ReadingSessionPage from '../src/pages/ReadingSessionPage'
import { TEXT } from '../src/constants/text'
import { resolveText } from '../src/constants/resolveText'
import { theme } from '../src/styles/theme'

const LEGACY_QUESTION_TEXT = 'LEGACY TEXT — MUST NOT BE USED'

const DEFAULT_CHILD_PROFILES = [
  { id: 'mock-child-profile-gaya', name: 'גאיה', grammaticalGender: 'female', readingLevel: 'beginner' },
]

const TWO_CHILD_PROFILES = [
  ...DEFAULT_CHILD_PROFILES,
  { id: 'mock-child-profile-omer', name: 'עומר', grammaticalGender: 'male', readingLevel: 'intermediate' },
]

function buildExercise(grammaticalGender) {
  return {
    title: 'הקסם בספרייה',
    story: 'גאיה נכנסה לספרייה ומצאה ספר ישן על פיות. כשהיא פתחה אותו, נפל ממנו עלה ירוק.',
    questions: [LEGACY_QUESTION_TEXT],
    readingGame: {
      instruction: 'מצאי בטקסט שתי מילים שמתחילות באות ס׳',
    },
    passageId: 'test-passage-1',
    sessionId: 'test-session-1',
    question: {
      id: 'test-question-1',
      passageId: 'test-passage-1',
      prompt: 'מה נפל מתוך הספר?',
    },
    grammaticalGender,
  }
}

const mockExercise = buildExercise('female')

function renderPage() {
  // Matches main.jsx exactly: StrictMode double-invokes effects in
  // development, so tests must exercise that too, or they can pass while
  // the real app doesn't.
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <ReadingSessionPage />
      </ThemeProvider>
    </StrictMode>,
  )
}

function getCreateButton() {
  return screen.getByRole('button', { name: TEXT.readingSession.createButtonLabel })
}

function getAnswerField(grammaticalGender = 'female') {
  return screen.getByRole('textbox', {
    name: resolveText('readingSession.answerInputAriaLabel', { grammaticalGender }),
  })
}

function getSubmitButton() {
  return screen.getByRole('button', {
    name: resolveText('readingSession.submitAnswerButtonLabel'),
  })
}

function getReplacementButton() {
  return screen.getByRole('button', {
    name: resolveText('readingSession.requestNextQuestionButtonLabel'),
  })
}

function okJson(body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function defaultChildProfilesHandler() {
  return okJson({ childProfiles: DEFAULT_CHILD_PROFILES })
}

function mockFetchRoutes({ childProfiles, preview, answers, nextQuestion }) {
  globalThis.fetch = vi.fn((url) => {
    if (url === '/api/child-profiles') {
      return (childProfiles ?? defaultChildProfilesHandler)()
    }

    if (url === '/api/reading-sessions/preview') {
      return preview()
    }

    if (url === '/api/reading-sessions/answers') {
      return answers()
    }

    if (url === '/api/reading-sessions/next-question') {
      if (!nextQuestion) {
        return Promise.reject(
          new Error('Unexpected fetch call to /api/reading-sessions/next-question'),
        )
      }

      return nextQuestion()
    }

    return Promise.reject(new Error(`Unexpected fetch call to ${url}`))
  })
}

async function renderWithExerciseLoaded(exercise, answers, nextQuestion, childProfiles) {
  mockFetchRoutes({
    preview: () => okJson(exercise),
    answers: answers ?? (() => okJson({})),
    nextQuestion,
    childProfiles,
  })

  renderPage()

  await screen.findByRole('option', { name: 'גאיה' })

  fireEvent.click(getCreateButton())

  await screen.findByText(exercise.question.prompt)
}

async function renderInRetryState(exercise, nextQuestion) {
  await renderWithExerciseLoaded(
    exercise,
    () => okJson({ questionId: exercise.question.id, isCorrect: false, feedbackType: 'retry' }),
    nextQuestion,
  )

  fireEvent.click(getSubmitButton())

  await screen.findByRole('button', {
    name: resolveText('readingSession.requestNextQuestionButtonLabel'),
  })
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ReadingSessionPage', () => {
  it('fetches the child-profile list on initial render, but does not fetch the preview yet', async () => {
    mockFetchRoutes({})

    renderPage()

    await screen.findByRole('option', { name: 'גאיה' })

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/child-profiles')

    const previewCalls = globalThis.fetch.mock.calls.filter(
      (call) => call[0] === '/api/reading-sessions/preview',
    )
    expect(previewCalls).toHaveLength(0)
  })

  it('renders both mock child profiles as selectable options', async () => {
    mockFetchRoutes({
      childProfiles: () => okJson({ childProfiles: TWO_CHILD_PROFILES }),
      preview: () => okJson(mockExercise),
    })

    renderPage()

    expect(await screen.findByRole('option', { name: 'גאיה' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'עומר' })).toBeInTheDocument()
  })

  it('sends mock-child-profile-omer when Omer is selected and the button is clicked', async () => {
    mockFetchRoutes({
      childProfiles: () => okJson({ childProfiles: TWO_CHILD_PROFILES }),
      preview: () => okJson(mockExercise),
    })

    renderPage()

    await screen.findByRole('option', { name: 'עומר' })

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'mock-child-profile-omer' },
    })
    fireEvent.click(getCreateButton())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/reading-sessions/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ childId: 'mock-child-profile-omer' }),
      }),
    )
  })

  it('sends the selected childId when the button is clicked', async () => {
    mockFetchRoutes({ preview: () => okJson(mockExercise) })
    renderPage()

    await screen.findByRole('option', { name: 'גאיה' })

    fireEvent.click(getCreateButton())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/reading-sessions/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ childId: 'mock-child-profile-gaya' }),
      }),
    )

    expect(await screen.findByText(mockExercise.title)).toBeInTheDocument()
  })

  it('shows the loading state and disables the button while waiting', async () => {
    mockFetchRoutes({ preview: () => new Promise(() => {}) })
    renderPage()

    await screen.findByRole('option', { name: 'גאיה' })

    fireEvent.click(getCreateButton())

    const button = screen.getByRole('button', { name: TEXT.readingSession.loading })
    expect(button).toBeDisabled()
  })

  it('displays the error message when the preview request fails', async () => {
    mockFetchRoutes({ preview: () => Promise.resolve({ ok: false }) })
    renderPage()

    await screen.findByRole('option', { name: 'גאיה' })

    fireEvent.click(getCreateButton())

    expect(await screen.findByText(TEXT.readingSession.error)).toBeInTheDocument()
  })

  it('renders the canonical question prompt and not the legacy questions array', async () => {
    await renderWithExerciseLoaded(mockExercise)

    expect(screen.getByText(mockExercise.question.prompt)).toBeInTheDocument()
    expect(screen.queryByText(LEGACY_QUESTION_TEXT)).not.toBeInTheDocument()
  })

  it('renders the answer field with the resolved accessible label', async () => {
    await renderWithExerciseLoaded(mockExercise)

    expect(getAnswerField()).toBeInTheDocument()
  })

  it('updates the controlled answer value as the child types', async () => {
    await renderWithExerciseLoaded(mockExercise)

    fireEvent.change(getAnswerField(), { target: { value: 'עלה ירוק' } })

    expect(getAnswerField()).toHaveValue('עלה ירוק')
  })

  it('submits the answer with exactly sessionId and answerText', async () => {
    await renderWithExerciseLoaded(mockExercise)

    fireEvent.change(getAnswerField(), { target: { value: 'עלה ירוק' } })
    fireEvent.click(getSubmitButton())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/reading-sessions/answers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 'test-session-1', answerText: 'עלה ירוק' }),
      }),
    )
  })

  it('submits a blank or whitespace-only answer unchanged', async () => {
    await renderWithExerciseLoaded(mockExercise)

    fireEvent.change(getAnswerField(), { target: { value: '   ' } })
    fireEvent.click(getSubmitButton())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/reading-sessions/answers',
      expect.objectContaining({
        body: JSON.stringify({ sessionId: 'test-session-1', answerText: '   ' }),
      }),
    )
  })

  it('disables the input and button while checking', async () => {
    let resolveAnswers
    await renderWithExerciseLoaded(
      mockExercise,
      () => new Promise((resolve) => { resolveAnswers = resolve }),
    )

    fireEvent.click(getSubmitButton())

    const checkingButton = screen.getByRole('button', {
      name: resolveText('readingSession.checkingLabel'),
    })
    expect(checkingButton).toBeDisabled()
    expect(getAnswerField()).toBeDisabled()

    resolveAnswers(okJson({ questionId: 'test-question-1', isCorrect: true, feedbackType: 'correct' }))
  })

  it('does not call the service again on a second submit while checking', async () => {
    let resolveAnswers
    await renderWithExerciseLoaded(
      mockExercise,
      () => new Promise((resolve) => { resolveAnswers = resolve }),
    )

    fireEvent.click(getSubmitButton())
    fireEvent.click(
      screen.getByRole('button', { name: resolveText('readingSession.checkingLabel') }),
    )

    const answerCalls = globalThis.fetch.mock.calls.filter(
      (call) => call[0] === '/api/reading-sessions/answers',
    )
    expect(answerCalls).toHaveLength(1)

    resolveAnswers(okJson({ questionId: 'test-question-1', isCorrect: true, feedbackType: 'correct' }))
  })

  it('displays the resolved correct-feedback text on a correct result', async () => {
    await renderWithExerciseLoaded(mockExercise, () =>
      okJson({ questionId: 'test-question-1', isCorrect: true, feedbackType: 'correct' }),
    )

    fireEvent.click(getSubmitButton())

    expect(
      await screen.findByText(resolveText('readingSession.correctFeedbackMessage')),
    ).toBeInTheDocument()
  })

  it('displays the resolved retry-feedback text on a retry result, with no input, button, or further requests', async () => {
    await renderWithExerciseLoaded(mockExercise, () =>
      okJson({ questionId: 'test-question-1', isCorrect: false, feedbackType: 'retry' }),
    )

    fireEvent.click(getSubmitButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.retryFeedbackMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()

    expect(getReplacementButton()).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: resolveText('readingSession.submitAnswerButtonLabel') }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: resolveText('readingSession.checkingLabel') }),
    ).not.toBeInTheDocument()

    const answerCalls = globalThis.fetch.mock.calls.filter(
      (call) => call[0] === '/api/reading-sessions/answers',
    )
    expect(answerCalls).toHaveLength(1)

    const nextQuestionCalls = globalThis.fetch.mock.calls.filter(
      (call) => call[0] === '/api/reading-sessions/next-question',
    )
    expect(nextQuestionCalls).toHaveLength(0)
  })

  it('displays the resolved error text when the request is rejected', async () => {
    await renderWithExerciseLoaded(mockExercise, () => Promise.resolve({ ok: false, status: 500 }))

    fireEvent.click(getSubmitButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()
  })

  it('treats an unsupported or malformed evaluation result as an error state', async () => {
    await renderWithExerciseLoaded(mockExercise, () =>
      okJson({ questionId: 'test-question-1', isCorrect: true, feedbackType: 'not-a-real-status' }),
    )

    fireEvent.click(getSubmitButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()
  })

  it.each([
    ['correct feedback without questionId', { isCorrect: true, feedbackType: 'correct' }],
    [
      'a wrong questionId',
      { questionId: 'wrong-question', isCorrect: true, feedbackType: 'correct' },
    ],
    [
      'isCorrect false with feedbackType correct',
      { questionId: 'test-question-1', isCorrect: false, feedbackType: 'correct' },
    ],
    [
      'isCorrect true with feedbackType retry',
      { questionId: 'test-question-1', isCorrect: true, feedbackType: 'retry' },
    ],
  ])('enters the error state for %s, not correct or retry', async (_label, malformedResult) => {
    await renderWithExerciseLoaded(mockExercise, () => okJson(malformedResult))

    fireEvent.click(getSubmitButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(resolveText('readingSession.correctFeedbackMessage')),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        resolveText('readingSession.retryFeedbackMessage', { grammaticalGender: 'female' }),
      ),
    ).not.toBeInTheDocument()
  })

  it('uses a synchronous guard so a second submission cannot slip through even if the button is re-enabled mid-flight', async () => {
    let resolveAnswers
    await renderWithExerciseLoaded(
      mockExercise,
      () => new Promise((resolve) => { resolveAnswers = resolve }),
    )

    const submitButton = getSubmitButton()
    fireEvent.click(submitButton)

    // Force the DOM back to an enabled state to prove the in-flight ref
    // guard — not merely React state or the disabled attribute — is what
    // blocks a second submission while the first request is still pending.
    submitButton.disabled = false

    fireEvent.click(submitButton)

    const answerCalls = globalThis.fetch.mock.calls.filter(
      (call) => call[0] === '/api/reading-sessions/answers',
    )
    expect(answerCalls).toHaveLength(1)

    resolveAnswers(okJson({ questionId: 'test-question-1', isCorrect: true, feedbackType: 'correct' }))
  })

  it('does not reveal the reading game after a correct result', async () => {
    await renderWithExerciseLoaded(mockExercise, () =>
      okJson({ questionId: 'test-question-1', isCorrect: true, feedbackType: 'correct' }),
    )

    fireEvent.click(getSubmitButton())

    expect(
      await screen.findByText(resolveText('readingSession.correctFeedbackMessage')),
    ).toBeInTheDocument()
    expect(screen.queryByText(mockExercise.readingGame.instruction)).not.toBeInTheDocument()
  })

  it('renders the localized fallback instead of an empty question section when question is null', async () => {
    const exerciseWithNullQuestion = { ...mockExercise, question: null }

    mockFetchRoutes({
      preview: () => okJson(exerciseWithNullQuestion),
      answers: () => okJson({}),
    })

    renderPage()

    await screen.findByRole('option', { name: 'גאיה' })

    fireEvent.click(getCreateButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.noMoreQuestionsFallbackMessage', {
          grammaticalGender: 'female',
        }),
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders the localized fallback instead of an empty question section when question is malformed', async () => {
    const exerciseWithMalformedQuestion = {
      ...mockExercise,
      question: { passageId: 'test-passage-1' },
    }

    mockFetchRoutes({
      preview: () => okJson(exerciseWithMalformedQuestion),
      answers: () => okJson({}),
    })

    renderPage()

    await screen.findByRole('option', { name: 'גאיה' })

    fireEvent.click(getCreateButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.noMoreQuestionsFallbackMessage', {
          grammaticalGender: 'female',
        }),
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('resolves female answer-cycle text from a female child fixture', async () => {
    const femaleExercise = buildExercise('female')
    await renderWithExerciseLoaded(femaleExercise, () =>
      okJson({ questionId: 'test-question-1', isCorrect: false, feedbackType: 'retry' }),
    )

    expect(getAnswerField('female')).toHaveAttribute(
      'placeholder',
      resolveText('readingSession.answerInputPlaceholder', { grammaticalGender: 'female' }),
    )

    fireEvent.click(getSubmitButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.retryFeedbackMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()
  })

  it('resolves male answer-cycle text from a male child fixture, with no gender fallback', async () => {
    const maleExercise = buildExercise('male')
    await renderWithExerciseLoaded(maleExercise, () =>
      okJson({ questionId: 'test-question-1', isCorrect: false, feedbackType: 'retry' }),
    )

    const femaleText = resolveText('readingSession.answerInputPlaceholder', {
      grammaticalGender: 'female',
    })
    const malePlaceholder = resolveText('readingSession.answerInputPlaceholder', {
      grammaticalGender: 'male',
    })

    expect(getAnswerField('male')).toHaveAttribute('placeholder', malePlaceholder)
    expect(malePlaceholder).not.toBe(femaleText)

    fireEvent.click(getSubmitButton())

    const femaleRetryText = resolveText('readingSession.retryFeedbackMessage', {
      grammaticalGender: 'female',
    })
    const maleRetryText = resolveText('readingSession.retryFeedbackMessage', {
      grammaticalGender: 'male',
    })

    expect(await screen.findByText(maleRetryText)).toBeInTheDocument()
    expect(screen.queryByText(femaleRetryText)).not.toBeInTheDocument()
  })

  it('calls fetchNextQuestion with exactly sessionId when the replacement action is clicked', async () => {
    await renderInRetryState(mockExercise, () => new Promise(() => {}))

    fireEvent.click(getReplacementButton())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/reading-sessions/next-question',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 'test-session-1' }),
      }),
    )
  })

  it('disables the replacement action while generating', async () => {
    let resolveNextQuestion
    await renderInRetryState(
      mockExercise,
      () => new Promise((resolve) => { resolveNextQuestion = resolve }),
    )

    fireEvent.click(getReplacementButton())

    const generatingButton = screen.getByRole('button', {
      name: resolveText('readingSession.generatingNextQuestionLabel'),
    })
    expect(generatingButton).toBeDisabled()

    resolveNextQuestion(
      okJson({
        question: { id: 'test-question-2', passageId: 'test-passage-1', prompt: 'שאלה חדשה?' },
      }),
    )
  })

  it('uses a synchronous guard so a second replacement request cannot slip through mid-flight', async () => {
    let resolveNextQuestion
    await renderInRetryState(
      mockExercise,
      () => new Promise((resolve) => { resolveNextQuestion = resolve }),
    )

    const replacementButton = getReplacementButton()
    fireEvent.click(replacementButton)

    // Force the DOM back to an enabled state to prove the in-flight ref
    // guard — not merely React state or the disabled attribute — blocks a
    // second replacement request while the first is still pending.
    replacementButton.disabled = false
    fireEvent.click(replacementButton)

    const nextQuestionCalls = globalThis.fetch.mock.calls.filter(
      (call) => call[0] === '/api/reading-sessions/next-question',
    )
    expect(nextQuestionCalls).toHaveLength(1)

    resolveNextQuestion(
      okJson({
        question: { id: 'test-question-2', passageId: 'test-passage-1', prompt: 'שאלה חדשה?' },
      }),
    )
  })

  it('replaces the question, keeps the passage unchanged, clears the answer, and returns to answering', async () => {
    const newQuestion = { id: 'test-question-2', passageId: 'test-passage-1', prompt: 'שאלה חדשה?' }

    await renderInRetryState(mockExercise, () => okJson({ question: newQuestion }))

    fireEvent.click(getReplacementButton())

    expect(await screen.findByText(newQuestion.prompt)).toBeInTheDocument()
    expect(screen.queryByText(mockExercise.question.prompt)).not.toBeInTheDocument()
    expect(screen.queryByText(LEGACY_QUESTION_TEXT)).not.toBeInTheDocument()

    // passage unchanged
    expect(screen.getByText(mockExercise.title)).toBeInTheDocument()
    expect(screen.getByText(mockExercise.story)).toBeInTheDocument()

    // back to answering, with a cleared, available input
    const answerField = getAnswerField()
    expect(answerField).not.toBeDisabled()
    expect(answerField).toHaveValue('')
    expect(
      screen.getByRole('button', { name: resolveText('readingSession.submitAnswerButtonLabel') }),
    ).toBeInTheDocument()
  })

  it('renders the localized error state when the replacement request is rejected', async () => {
    await renderInRetryState(mockExercise, () => Promise.resolve({ ok: false, status: 500 }))

    fireEvent.click(getReplacementButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()
  })

  it.each([
    ['a null question', { question: null }],
    [
      'a malformed question missing id',
      { question: { passageId: 'test-passage-1', prompt: 'INVALID PROMPT — MISSING ID' } },
    ],
    [
      'a malformed question missing prompt',
      { question: { id: 'test-question-2', passageId: 'test-passage-1' } },
    ],
    [
      'a whitespace-only id',
      {
        question: {
          id: '   ',
          passageId: 'test-passage-1',
          prompt: 'INVALID PROMPT — WHITESPACE ID',
        },
      },
    ],
    [
      'a whitespace-only prompt',
      { question: { id: 'test-question-2', passageId: 'test-passage-1', prompt: '   ' } },
    ],
  ])(
    'renders the localized error and does not replace the current question for %s',
    async (_label, invalidResponse) => {
      await renderInRetryState(mockExercise, () => okJson(invalidResponse))

      fireEvent.click(getReplacementButton())

      expect(
        await screen.findByText(
          resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
        ),
      ).toBeInTheDocument()

      // The answer input must not reappear, as it would if a valid new
      // question had been accepted.
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

      if (invalidResponse.question && invalidResponse.question.prompt) {
        expect(screen.queryByText(invalidResponse.question.prompt)).not.toBeInTheDocument()
      }
    },
  )

  it('renders the localized error when the replacement response has a mismatched sessionId', async () => {
    await renderInRetryState(mockExercise, () =>
      okJson({
        sessionId: 'a-different-session',
        question: { id: 'test-question-2', passageId: 'test-passage-1', prompt: 'שאלה חדשה?' },
      }),
    )

    fireEvent.click(getReplacementButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('שאלה חדשה?')).not.toBeInTheDocument()
  })

  it('renders the localized error when the replacement has the same question id as the current question', async () => {
    await renderInRetryState(mockExercise, () =>
      okJson({
        question: {
          id: mockExercise.question.id,
          passageId: 'test-passage-1',
          prompt: 'שאלה כביכול חדשה',
        },
      }),
    )

    fireEvent.click(getReplacementButton())

    expect(
      await screen.findByText(
        resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('שאלה כביכול חדשה')).not.toBeInTheDocument()
  })

  it('does not leave the UI stuck in generating after a replacement failure', async () => {
    await renderInRetryState(mockExercise, () => Promise.resolve({ ok: false, status: 500 }))

    fireEvent.click(getReplacementButton())

    await screen.findByText(
      resolveText('readingSession.answerCycleErrorMessage', { grammaticalGender: 'female' }),
    )

    expect(
      screen.queryByRole('button', {
        name: resolveText('readingSession.generatingNextQuestionLabel'),
      }),
    ).not.toBeInTheDocument()
  })

  it('resolves gendered retry text correctly within the replacement flow for a male fixture, with no fallback', async () => {
    const maleExercise = buildExercise('male')

    await renderInRetryState(maleExercise)

    const femaleRetryText = resolveText('readingSession.retryFeedbackMessage', {
      grammaticalGender: 'female',
    })
    const maleRetryText = resolveText('readingSession.retryFeedbackMessage', {
      grammaticalGender: 'male',
    })

    expect(screen.getByText(maleRetryText)).toBeInTheDocument()
    expect(screen.queryByText(femaleRetryText)).not.toBeInTheDocument()
    expect(getReplacementButton()).toBeInTheDocument()
  })
})
