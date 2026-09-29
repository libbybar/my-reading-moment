import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter, Routes, Route } from 'react-router'
import ChildProgressPage from '../../src/pages/ChildProgressPage'
import { TEXT } from '../../src/constants/text'
import { theme } from '../../src/styles/theme'
import { fetchChildProgress, ChildProfileServiceError } from '../../src/services/childProfileService'

vi.mock('../../src/services/childProfileService', () => ({
  fetchChildProgress: vi.fn(),
  ChildProfileServiceError: class ChildProfileServiceError extends Error {
    constructor(message, { status, body } = {}) {
      super(message)
      this.name = 'ChildProfileServiceError'
      this.status = status
      this.body = body
    }
  },
}))

const CHILD_ID = 'profile-alpha'

const PROGRESS_FIXTURE = {
  currentLevel: 2,
  currentSublevel: 3,
  journeyProgress: 14,
  results: [
    { level: 1, sublevel: 1, result: 'success', completedAt: '2026-01-01T10:00:00.000Z' },
    { level: 1, sublevel: 2, result: 'failure', completedAt: '2026-01-02T10:00:00.000Z' },
  ],
}

function renderChildProgressPage({ childId = CHILD_ID } = {}) {
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[`/parent-zone/${childId}/progress`]}>
          <Routes>
            <Route path="/parent-zone/:childId/progress" element={<ChildProgressPage />} />
            <Route path="/parent-zone" element={<div>PARENT_ZONE_SENTINEL</div>} />
            <Route path="/login" element={<div>LOGIN_SENTINEL</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  fetchChildProgress.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ChildProgressPage', () => {
  it('requests progress for the childId from the route', async () => {
    fetchChildProgress.mockResolvedValue(PROGRESS_FIXTURE)

    renderChildProgressPage()

    await screen.findByText(TEXT.childProgress.heading)

    expect(fetchChildProgress).toHaveBeenCalledWith(CHILD_ID)
  })

  it('shows the localized loading state while the request is pending', () => {
    fetchChildProgress.mockReturnValue(new Promise(() => {}))

    renderChildProgressPage()

    expect(screen.getByText(TEXT.childProgress.loading)).toBeInTheDocument()
  })

  it('shows the current level and journey progress once loaded', async () => {
    fetchChildProgress.mockResolvedValue(PROGRESS_FIXTURE)

    renderChildProgressPage()

    expect(await screen.findByText('2.3')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('shows the no-history message when the child has no completed texts yet', async () => {
    fetchChildProgress.mockResolvedValue({ ...PROGRESS_FIXTURE, results: [] })

    renderChildProgressPage()

    expect(await screen.findByText(TEXT.childProgress.noHistoryMessage)).toBeInTheDocument()
  })

  it('does not show the no-history message when there is history', async () => {
    fetchChildProgress.mockResolvedValue(PROGRESS_FIXTURE)

    renderChildProgressPage()

    await screen.findByText(TEXT.childProgress.heading)

    expect(screen.queryByText(TEXT.childProgress.noHistoryMessage)).not.toBeInTheDocument()
  })

  it('redirects to /login (not the generic error) when the request is unauthorized', async () => {
    fetchChildProgress.mockRejectedValue(
      new ChildProfileServiceError('unauthorized', { status: 401 }),
    )

    renderChildProgressPage()

    expect(await screen.findByText('LOGIN_SENTINEL')).toBeInTheDocument()
  })

  it('redirects to /parent-zone (not a broken-page error) for an unowned or unknown childId', async () => {
    fetchChildProgress.mockRejectedValue(
      new ChildProfileServiceError('not found', { status: 404 }),
    )

    renderChildProgressPage()

    expect(await screen.findByText('PARENT_ZONE_SENTINEL')).toBeInTheDocument()
  })

  it('shows the localized error state for any other failure', async () => {
    fetchChildProgress.mockRejectedValue(new ChildProfileServiceError('boom', { status: 500 }))

    renderChildProgressPage()

    expect(await screen.findByText(TEXT.childProgress.error)).toBeInTheDocument()
  })

  it('redirects to /parent-zone, where the gate asks for the PIN, when the parent-zone session is locked', async () => {
    fetchChildProgress.mockRejectedValue(
      new ChildProfileServiceError('locked', { status: 403, body: { errorCode: 'parent_zone_locked' } }),
    )

    renderChildProgressPage()

    expect(await screen.findByText('PARENT_ZONE_SENTINEL')).toBeInTheDocument()
    expect(screen.queryByText(TEXT.childProgress.error)).not.toBeInTheDocument()
  })

  it('shows the generic error for a 403 that is not a locked parent zone', async () => {
    fetchChildProgress.mockRejectedValue(
      new ChildProfileServiceError('forbidden', { status: 403, body: { errorCode: 'something_else' } }),
    )

    renderChildProgressPage()

    expect(await screen.findByText(TEXT.childProgress.error)).toBeInTheDocument()
  })

  it('navigates back to /parent-zone when the back button is clicked', async () => {
    fetchChildProgress.mockResolvedValue(PROGRESS_FIXTURE)

    renderChildProgressPage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.childProgress.backButtonLabel }))

    expect(await screen.findByText('PARENT_ZONE_SENTINEL')).toBeInTheDocument()
  })
})
