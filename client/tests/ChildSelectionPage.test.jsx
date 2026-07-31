import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter } from 'react-router'
import ChildSelectionPage from '../src/pages/ChildSelectionPage'
import { ActiveChildProvider } from '../src/context/ActiveChildProvider'
import { TEXT } from '../src/constants/text'
import { theme } from '../src/styles/theme'
import { fetchChildProfiles } from '../src/services/childProfileService'
import { getChildAvatar } from '../src/constants/childAvatars'

vi.mock('../src/services/childProfileService', () => ({
  fetchChildProfiles: vi.fn(),
}))

vi.mock('../src/constants/childAvatars', () => ({
  getChildAvatar: vi.fn(() => <span data-testid="avatar-sentinel">AVATAR</span>),
}))

const GENERIC_PROFILES = [
  { id: 'profile-alpha', name: 'פרופיל אלפא', grammaticalGender: 'female', readingLevel: 'beginner' },
  { id: 'profile-beta', name: 'פרופיל בטא', grammaticalGender: 'male', readingLevel: 'intermediate' },
  { id: 'profile-gamma', name: 'פרופיל גמא', grammaticalGender: 'female', readingLevel: 'advanced' },
]

function renderPage() {
  // StrictMode keeps stale-effect behavior aligned with the real app.
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <ActiveChildProvider>
          <MemoryRouter initialEntries={['/children']}>
            <ChildSelectionPage />
          </MemoryRouter>
        </ActiveChildProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

function expectOnlyLoadingVisible() {
  expect(screen.getByText(TEXT.childSelection.loading)).toBeInTheDocument()
  expect(screen.queryByText(TEXT.childSelection.error)).not.toBeInTheDocument()
  expect(screen.queryByText(TEXT.childSelection.emptyMessage)).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
}

function expectOnlyErrorVisible() {
  expect(screen.getByText(TEXT.childSelection.error)).toBeInTheDocument()
  expect(screen.queryByText(TEXT.childSelection.loading)).not.toBeInTheDocument()
  expect(screen.queryByText(TEXT.childSelection.emptyMessage)).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
}

beforeEach(() => {
  fetchChildProfiles.mockReset()
  getChildAvatar.mockClear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ChildSelectionPage', () => {
  it('calls fetchChildProfiles (the child-profile service boundary) when the page mounts', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderPage()

    await screen.findByRole('button', { name: GENERIC_PROFILES[0].name })

    expect(fetchChildProfiles).toHaveBeenCalled()
  })

  it('shows only the localized loading state before the profiles resolve', () => {
    fetchChildProfiles.mockReturnValue(new Promise(() => {}))

    renderPage()

    expectOnlyLoadingVisible()
  })

  it('renders each profile as an accessible avatar button, with loading/error/empty hidden', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderPage()

    for (const profile of GENERIC_PROFILES) {
      expect(await screen.findByRole('button', { name: profile.name })).toBeInTheDocument()
    }

    expect(screen.getAllByRole('button')).toHaveLength(GENERIC_PROFILES.length)
    expect(screen.getAllByTestId('avatar-sentinel')).toHaveLength(GENERIC_PROFILES.length)
    expect(screen.queryByText(TEXT.childSelection.loading)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXT.childSelection.error)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXT.childSelection.emptyMessage)).not.toBeInTheDocument()
  })

  it('renders a single dynamically-provided profile just as well as many', async () => {
    const oneProfile = [
      { id: 'only-one', name: 'ילד יחיד', grammaticalGender: 'male', readingLevel: 'beginner' },
    ]
    fetchChildProfiles.mockResolvedValue({ childProfiles: oneProfile })

    renderPage()

    expect(await screen.findByRole('button', { name: 'ילד יחיד' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('shows only the localized empty-state message when no profiles are returned', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })

    renderPage()

    expect(await screen.findByText(TEXT.childSelection.emptyMessage)).toBeInTheDocument()
    expect(screen.queryByText(TEXT.childSelection.loading)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXT.childSelection.error)).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows only the localized error state when the service call rejects with a service-level failure', async () => {
    fetchChildProfiles.mockRejectedValue(new Error('Request failed with status 500'))

    renderPage()

    await screen.findByText(TEXT.childSelection.error)

    expectOnlyErrorVisible()
  })

  it('shows the same error-only state when the underlying request is rejected outright', async () => {
    fetchChildProfiles.mockRejectedValue(new TypeError('Failed to fetch'))

    renderPage()

    await screen.findByText(TEXT.childSelection.error)

    expectOnlyErrorVisible()
  })

  it('ignores a stale StrictMode-duplicate request that resolves after the current one', async () => {
    let resolveStale
    let resolveCurrent

    fetchChildProfiles
      .mockImplementationOnce(() => new Promise((resolve) => { resolveStale = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveCurrent = resolve }))

    renderPage()

    const currentProfile = {
      id: 'current-profile',
      name: 'פרופיל נוכחי',
      grammaticalGender: 'female',
      readingLevel: 'beginner',
    }
    const staleProfile = {
      id: 'stale-profile',
      name: 'פרופיל ישן',
      grammaticalGender: 'male',
      readingLevel: 'beginner',
    }

    resolveCurrent({ childProfiles: [currentProfile] })
    await screen.findByRole('button', { name: currentProfile.name })

    // The cleaned-up first effect must not clobber the current profiles.
    resolveStale({ childProfiles: [staleProfile] })
    await Promise.resolve()
    await Promise.resolve()

    expect(screen.getByRole('button', { name: currentProfile.name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: staleProfile.name })).not.toBeInTheDocument()
  })

  it('passes each exact profile object to getChildAvatar', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderPage()

    await screen.findByRole('button', { name: GENERIC_PROFILES[0].name })

    for (const profile of GENERIC_PROFILES) {
      expect(getChildAvatar).toHaveBeenCalledWith(profile)
    }
  })
})
