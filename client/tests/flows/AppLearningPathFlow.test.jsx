import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import App from '../../src/App'
import { TEXT } from '../../src/constants/text'
import { resolveText } from '../../src/constants/resolveText'
import { theme } from '../../src/styles/theme'
import { fetchChildProfiles } from '../../src/services/childProfileService'

vi.mock('../../src/services/childProfileService', () => ({
  fetchChildProfiles: vi.fn(),
}))

vi.mock('../../src/constants/childAvatars', () => ({
  getChildAvatar: () => <span data-testid="avatar-sentinel">AVATAR</span>,
}))

const GENERIC_PROFILES = [
  {
    id: 'profile-alpha',
    name: 'פרופיל אלפא',
    grammaticalGender: 'female',
    readingLevel: 'beginner',
    avatarId: 'star',
  },
]

const EXERCISE = {
  title: 'הקסם בספרייה',
  story: 'גאיה נכנסה לספרייה ומצאה ספר ישן על פיות. כשהיא פתחה אותו, נפל ממנו עלה ירוק.',
  questions: [],
  passageId: 'test-passage-1',
  sessionId: 'test-session-1',
  question: { id: 'test-question-1', passageId: 'test-passage-1', prompt: 'מה נפל מתוך הספר?' },
  grammaticalGender: 'female',
}

function okJson(body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function okPreviewStream(exercise) {
  const encoder = new TextEncoder()
  const lines = [
    { type: 'title', title: exercise.title },
    { type: 'chunk', text: exercise.story },
    {
      type: 'done',
      title: exercise.title,
      story: exercise.story,
      passageId: exercise.passageId,
      sessionId: exercise.sessionId,
      question: null,
      grammaticalGender: exercise.grammaticalGender,
    },
  ].map((event) => `${JSON.stringify(event)}\n`)
  let index = 0

  return Promise.resolve({
    ok: true,
    status: 200,
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
  })
}

function stationAccessibleName(stepNumber, statusLabel) {
  return `${TEXT.childHome.stepLabelPrefix} ${stepNumber}, ${statusLabel}`
}

function renderAppAtPath(path) {
  window.history.pushState({}, '', path)

  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}

let journeyProgress

beforeEach(() => {
  journeyProgress = 0

  fetchChildProfiles.mockReset()
  fetchChildProfiles.mockImplementation(() =>
    Promise.resolve({
      childProfiles: [{ ...GENERIC_PROFILES[0], journeyProgress }],
    }),
  )

  globalThis.fetch = vi.fn((url) => {
    if (url === '/api/reading-sessions/preview') {
      return okPreviewStream(EXERCISE)
    }

    if (url === '/api/reading-sessions/question') {
      return okJson({ question: EXERCISE.question })
    }

    if (url === '/api/reading-sessions/answers') {
      // The server advances journeyProgress as a side effect of a successful
      // answer now — no separate client call, so the test simulates that here.
      journeyProgress += 1
      return okJson({
        questionId: EXERCISE.question.id,
        isCorrect: true,
        feedbackType: 'correct',
        textOutcome: 'success',
      })
    }

    return Promise.reject(new Error(`Unexpected fetch call to ${url}`))
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('App learning-path flow', () => {
  it('closes the loop: /children → /child-home → practice → correct answer → back home with the next step unlocked', async () => {
    const selectedProfile = GENERIC_PROFILES[0]

    renderAppAtPath('/children')

    fireEvent.click(await screen.findByRole('button', { name: selectedProfile.name }))

    const step1ActiveButton = await screen.findByRole('button', {
      name: stationAccessibleName(1, TEXT.childHome.activeStationAccessibleLabel),
    })
    expect(
      screen.getByRole('group', { name: stationAccessibleName(2, TEXT.childHome.lockedStepStatusLabel) }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: stationAccessibleName(3, TEXT.childHome.lockedStepStatusLabel) }),
    ).toBeInTheDocument()

    fireEvent.click(step1ActiveButton)

    fireEvent.click(
      await screen.findByRole('button', {
        name: resolveText('readingSession.finishedReadingButtonLabel'),
      }),
    )

    await screen.findByText(EXERCISE.question.prompt)

    fireEvent.click(
      screen.getByRole('button', { name: resolveText('readingSession.submitAnswerButtonLabel') }),
    )
    await screen.findByText(resolveText('readingSession.correctFeedbackMessage'))

    fireEvent.click(
      screen.getByRole('button', { name: resolveText('readingSession.returnToPathButtonLabel') }),
    )

    expect(
      await screen.findByRole('group', {
        name: stationAccessibleName(1, TEXT.childHome.completedStepStatusLabel),
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: stationAccessibleName(2, TEXT.childHome.activeStationAccessibleLabel),
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: stationAccessibleName(3, TEXT.childHome.lockedStepStatusLabel) }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/child-home')
  }, 10000)
})
