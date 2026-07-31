import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter, Routes, Route } from 'react-router'
import ChildHomePage from '../src/pages/ChildHomePage'
import { ActiveChildProvider } from '../src/context/ActiveChildProvider'
import { LearningPathProvider } from '../src/context/LearningPathProvider'
import { TEXT } from '../src/constants/text'
import { resolveText } from '../src/constants/resolveText'
import { theme } from '../src/styles/theme'
import { fetchChildProfiles } from '../src/services/childProfileService'

vi.mock('../src/services/childProfileService', () => ({
  fetchChildProfiles: vi.fn(),
}))

vi.mock('../src/constants/childAvatars', () => ({
  getChildAvatar: () => <span data-testid="avatar-sentinel">AVATAR</span>,
}))

const ACTIVE_PROFILE = {
  id: 'profile-alpha',
  name: 'פרופיל אלפא',
  grammaticalGender: 'female',
  readingLevel: 'beginner',
}

const OTHER_PROFILE = {
  id: 'profile-beta',
  name: 'פרופיל בטא',
  grammaticalGender: 'male',
  readingLevel: 'intermediate',
}

const ACTIVE_STATION_ACCESSIBLE_NAME = `${TEXT.childHome.stepLabelPrefix} 1, ${TEXT.childHome.activeStationAccessibleLabel}`

function renderChildHomePage({
  initialActiveChildId = ACTIVE_PROFILE.id,
  initialProgressByChildId = {},
} = {}) {
  // StrictMode keeps stale-effect behavior aligned with the real app.
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <ActiveChildProvider initialActiveChildId={initialActiveChildId}>
          <LearningPathProvider initialProgressByChildId={initialProgressByChildId}>
            <MemoryRouter initialEntries={['/child-home']}>
              <Routes>
                <Route path="/child-home" element={<ChildHomePage />} />
                <Route path="/children" element={<div>CHILD_SELECTION_SENTINEL</div>} />
                <Route path="/" element={<div>READING_SESSION_SENTINEL</div>} />
              </Routes>
            </MemoryRouter>
          </LearningPathProvider>
        </ActiveChildProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  fetchChildProfiles.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ChildHomePage', () => {
  it('redirects to /children when there is no active child (direct visit or refresh)', async () => {
    renderChildHomePage({ initialActiveChildId: null })

    expect(await screen.findByText('CHILD_SELECTION_SENTINEL')).toBeInTheDocument()
  })

  it('shows the localized loading state while resolving the active profile', () => {
    fetchChildProfiles.mockReturnValue(new Promise(() => {}))

    renderChildHomePage()

    expect(screen.getByText(TEXT.childHome.loading)).toBeInTheDocument()
  })

  it('renders the resolved active profile name, avatar, and gendered greeting', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE, OTHER_PROFILE] })

    renderChildHomePage()

    expect(await screen.findByText(ACTIVE_PROFILE.name)).toBeInTheDocument()
    expect(screen.getByTestId('avatar-sentinel')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: resolveText('childHome.heading', { grammaticalGender: 'female' }),
      }),
    ).toBeInTheDocument()
  })

  it('shows exactly one active station and the locked stations as non-interactive', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    await screen.findByText(ACTIVE_PROFILE.name)

    expect(screen.getAllByRole('button', { name: ACTIVE_STATION_ACCESSIBLE_NAME })).toHaveLength(1)
    expect(screen.getAllByRole('group')).toHaveLength(11)
  })

  it('numbers the active station and exposes locked station labels', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    const activeButton = await screen.findByRole('button', { name: ACTIVE_STATION_ACCESSIBLE_NAME })
    expect(activeButton).toHaveTextContent('1')

    expect(
      screen.getByRole('group', {
        name: `${TEXT.childHome.stepLabelPrefix} 2, ${TEXT.childHome.lockedStepStatusLabel}`,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', {
        name: `${TEXT.childHome.stepLabelPrefix} 3, ${TEXT.childHome.lockedStepStatusLabel}`,
      }),
    ).toBeInTheDocument()
  })

  it('renders step 1 as completed and step 2 as the new active station after one recorded completion', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage({
      initialProgressByChildId: { [ACTIVE_PROFILE.id]: { completedStepCount: 1 } },
    })

    await screen.findByText(ACTIVE_PROFILE.name)

    expect(
      screen.getByRole('group', {
        name: `${TEXT.childHome.stepLabelPrefix} 1, ${TEXT.childHome.completedStepStatusLabel}`,
      }),
    ).toBeInTheDocument()

    const activeButton = screen.getByRole('button', {
      name: `${TEXT.childHome.stepLabelPrefix} 2, ${TEXT.childHome.activeStationAccessibleLabel}`,
    })
    expect(activeButton).toHaveTextContent('2')

    expect(
      screen.getByRole('group', {
        name: `${TEXT.childHome.stepLabelPrefix} 3, ${TEXT.childHome.lockedStepStatusLabel}`,
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('group')).toHaveLength(11)
  })

  it('clicking the new active station after progress still navigates to /', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage({
      initialProgressByChildId: { [ACTIVE_PROFILE.id]: { completedStepCount: 1 } },
    })

    const activeButton = await screen.findByRole('button', {
      name: `${TEXT.childHome.stepLabelPrefix} 2, ${TEXT.childHome.activeStationAccessibleLabel}`,
    })
    fireEvent.click(activeButton)

    expect(await screen.findByText('READING_SESSION_SENTINEL')).toBeInTheDocument()
  })

  it('navigates to / when the active station is clicked', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    const stationButton = await screen.findByRole('button', { name: ACTIVE_STATION_ACCESSIBLE_NAME })
    fireEvent.click(stationButton)

    expect(await screen.findByText('READING_SESSION_SENTINEL')).toBeInTheDocument()
  })

  it('navigates to /children when the switch-child action is clicked', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    const switchButton = await screen.findByRole('button', {
      name: TEXT.childHome.switchChildButtonLabel,
    })
    fireEvent.click(switchButton)

    expect(await screen.findByText('CHILD_SELECTION_SENTINEL')).toBeInTheDocument()
  })

  it('redirects to /children when the active id matches no fetched profile', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [OTHER_PROFILE] })

    renderChildHomePage()

    expect(await screen.findByText('CHILD_SELECTION_SENTINEL')).toBeInTheDocument()
  })

  it('shows the localized error state when fetching profiles fails', async () => {
    fetchChildProfiles.mockRejectedValue(new Error('network down'))

    renderChildHomePage()

    expect(await screen.findByText(TEXT.childHome.error)).toBeInTheDocument()
  })

  it('ignores a stale StrictMode-duplicate fetch that resolves after the current one', async () => {
    let resolveStale
    let resolveCurrent

    fetchChildProfiles
      .mockImplementationOnce(() => new Promise((resolve) => { resolveStale = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveCurrent = resolve }))

    renderChildHomePage()

    resolveCurrent({ childProfiles: [ACTIVE_PROFILE] })
    await screen.findByText(ACTIVE_PROFILE.name)

    // The cleaned-up first effect must not clobber the current profile.
    resolveStale({ childProfiles: [OTHER_PROFILE] })
    await Promise.resolve()
    await Promise.resolve()

    expect(screen.getByText(ACTIVE_PROFILE.name)).toBeInTheDocument()
    expect(screen.queryByText(OTHER_PROFILE.name)).not.toBeInTheDocument()
  })
})
