import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import ReadingSessionPage from '../src/pages/ReadingSessionPage'
import { TEXT } from '../src/constants/text'
import { theme } from '../src/styles/theme'

const mockExercise = {
  title: 'הקסם בספרייה',
  story: 'גאיה נכנסה לספרייה ומצאה ספר ישן על פיות. כשהיא פתחה אותו, נפל ממנו עלה ירוק.',
  questions: ['מה נפל מתוך הספר?', 'איפה גאיה מצאה את הספר?'],
  readingGame: {
    instruction: 'מצאי בטקסט שתי מילים שמתחילות באות ס׳',
  },
}

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <ReadingSessionPage />
    </ThemeProvider>,
  )
}

function getCreateButton() {
  return screen.getByRole('button', { name: TEXT.readingSession.createButtonLabel })
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ReadingSessionPage', () => {
  it('does not send a request on initial render', () => {
    renderPage()

    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('sends the selected childId when the button is clicked', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockExercise) })
    renderPage()

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

  it('shows the loading state and disables the button while waiting', () => {
    globalThis.fetch.mockReturnValue(new Promise(() => {}))
    renderPage()

    fireEvent.click(getCreateButton())

    const button = screen.getByRole('button', { name: TEXT.readingSession.loading })
    expect(button).toBeDisabled()
  })

  it('displays the reading exercise on a successful response, one question at a time', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockExercise) })
    renderPage()

    fireEvent.click(getCreateButton())

    expect(await screen.findByText(mockExercise.title)).toBeInTheDocument()
    expect(screen.getByText(mockExercise.story)).toBeInTheDocument()
    expect(screen.getByText(mockExercise.questions[0])).toBeInTheDocument()
    expect(screen.queryByText(mockExercise.questions[1])).not.toBeInTheDocument()
    expect(screen.queryByText(mockExercise.readingGame.instruction)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: TEXT.readingSession.nextQuestionButtonLabel }))

    expect(screen.getByText(mockExercise.questions[1])).toBeInTheDocument()
    expect(screen.queryByText(mockExercise.questions[0])).not.toBeInTheDocument()
  })

  it('shows a completion message after answering the last question', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockExercise) })
    renderPage()

    fireEvent.click(getCreateButton())
    await screen.findByText(mockExercise.questions[0])

    fireEvent.click(screen.getByRole('button', { name: TEXT.readingSession.nextQuestionButtonLabel }))
    fireEvent.click(screen.getByRole('button', { name: TEXT.readingSession.nextQuestionButtonLabel }))

    expect(screen.getByText(TEXT.readingSession.questionsCompleteMessage)).toBeInTheDocument()
    expect(screen.queryByText(mockExercise.questions[1])).not.toBeInTheDocument()
    expect(screen.getByText(mockExercise.readingGame.instruction)).toBeInTheDocument()
  })

  it('displays the error message when the request fails', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false })
    renderPage()

    fireEvent.click(getCreateButton())

    expect(await screen.findByText(TEXT.readingSession.error)).toBeInTheDocument()
  })
})
