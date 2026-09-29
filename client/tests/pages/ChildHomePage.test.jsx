import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter, Routes, Route } from 'react-router'
import ChildHomePage from '../../src/pages/ChildHomePage'
import { ActiveChildProvider } from '../../src/context/ActiveChildProvider'
import { TEXT } from '../../src/constants/text'
import { resolveText } from '../../src/constants/resolveText'
import { theme } from '../../src/styles/theme'
import {
  fetchChildProfiles,
  updateChildAvatar,
  ChildProfileServiceError,
} from '../../src/services/childProfileService'

vi.mock('../../src/services/childProfileService', () => ({
  fetchChildProfiles: vi.fn(),
  updateChildAvatar: vi.fn(),
  ChildProfileServiceError: class ChildProfileServiceError extends Error {
    constructor(message, { status, body } = {}) {
      super(message)
      this.name = 'ChildProfileServiceError'
      this.status = status
      this.body = body
    }
  },
}))

vi.mock('../../src/constants/childAvatars', () => ({
  getChildAvatar: () => <span data-testid="avatar-sentinel">AVATAR</span>,
}))

const ACTIVE_PROFILE = {
  id: 'profile-alpha',
  name: 'פרופיל אלפא',
  grammaticalGender: 'female',
  readingLevel: 'beginner',
  avatarId: 'star',
}

const OTHER_PROFILE = {
  id: 'profile-beta',
  name: 'פרופיל בטא',
  grammaticalGender: 'male',
  readingLevel: 'intermediate',
  avatarId: 'dragon',
}

const ACTIVE_STATION_ACCESSIBLE_NAME = `${TEXT.childHome.stepLabelPrefix} 1, ${TEXT.childHome.activeStationAccessibleLabel}`

function renderChildHomePage({ initialActiveChildId = ACTIVE_PROFILE.id } = {}) {
  // StrictMode keeps stale-effect behavior aligned with the real app.
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <ActiveChildProvider initialActiveChildId={initialActiveChildId}>
          <MemoryRouter initialEntries={['/child-home']}>
            <Routes>
              <Route path="/child-home" element={<ChildHomePage />} />
              <Route path="/children" element={<div>CHILD_SELECTION_SENTINEL</div>} />
              <Route path="/" element={<div>READING_SESSION_SENTINEL</div>} />
              <Route path="/login" element={<div>LOGIN_SENTINEL</div>} />
              <Route path="/parent-zone" element={<div>PARENT_ZONE_SENTINEL</div>} />
            </Routes>
          </MemoryRouter>
        </ActiveChildProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  fetchChildProfiles.mockReset()
  updateChildAvatar.mockReset()
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
    expect(screen.getAllByRole('group')).toHaveLength(7)
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
    fetchChildProfiles.mockResolvedValue({
      childProfiles: [{ ...ACTIVE_PROFILE, journeyProgress: 1 }],
    })

    renderChildHomePage()

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

    expect(screen.getAllByRole('group')).toHaveLength(8)
  })

  it('renders an active station well past the old fixed 12-station cap, proving the path has no maximum', async () => {
    fetchChildProfiles.mockResolvedValue({
      childProfiles: [{ ...ACTIVE_PROFILE, journeyProgress: 20 }],
    })

    renderChildHomePage()

    const activeButton = await screen.findByRole('button', {
      name: `${TEXT.childHome.stepLabelPrefix} 21, ${TEXT.childHome.activeStationAccessibleLabel}`,
    })
    expect(activeButton).toHaveTextContent('21')
  })

  it('clicking the new active station after progress still navigates to /', async () => {
    fetchChildProfiles.mockResolvedValue({
      childProfiles: [{ ...ACTIVE_PROFILE, journeyProgress: 1 }],
    })

    renderChildHomePage()

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

  it('navigates to /parent-zone when the parent-zone entry point is clicked', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    const entryButton = await screen.findByRole('button', {
      name: TEXT.parentZone.entryButtonAriaLabel,
    })
    fireEvent.click(entryButton)

    expect(await screen.findByText('PARENT_ZONE_SENTINEL')).toBeInTheDocument()
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

  it('redirects to /login (not the generic error) when the profile fetch is unauthorized', async () => {
    fetchChildProfiles.mockRejectedValue(
      new ChildProfileServiceError('Request failed with status 401', { status: 401 }),
    )

    renderChildHomePage()

    expect(await screen.findByText('LOGIN_SENTINEL')).toBeInTheDocument()
    expect(screen.queryByText(TEXT.childHome.error)).not.toBeInTheDocument()
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

describe('ChildHomePage — avatar picker', () => {
  const PROFILE_WITHOUT_AVATAR = {
    id: 'profile-gamma',
    name: 'פרופיל גמא',
    grammaticalGender: 'female',
    readingLevel: 'beginner',
    avatarId: null,
  }

  it('shows the avatar picker instead of the station path when the child has not chosen one yet', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [PROFILE_WITHOUT_AVATAR] })

    renderChildHomePage({ initialActiveChildId: PROFILE_WITHOUT_AVATAR.id })

    expect(await screen.findByText(TEXT.childHome.avatarPickerHeading)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXT.avatars.starLabel })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXT.avatars.dragonLabel })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXT.avatars.unicornLabel })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXT.avatars.chrysanthemumLabel })).toBeInTheDocument()
  })

  it('picking an avatar saves it and reveals the normal home view', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [PROFILE_WITHOUT_AVATAR] })
    updateChildAvatar.mockResolvedValue({ ...PROFILE_WITHOUT_AVATAR, avatarId: 'unicorn' })

    renderChildHomePage({ initialActiveChildId: PROFILE_WITHOUT_AVATAR.id })

    fireEvent.click(await screen.findByRole('button', { name: TEXT.avatars.unicornLabel }))

    expect(updateChildAvatar).toHaveBeenCalledWith(PROFILE_WITHOUT_AVATAR.id, 'unicorn')
    expect(
      await screen.findByRole('button', { name: TEXT.childHome.switchChildButtonLabel }),
    ).toBeInTheDocument()
    expect(screen.queryByText(TEXT.childHome.avatarPickerHeading)).not.toBeInTheDocument()
  })

  it('shows a localized error and keeps the picker open when saving the avatar fails', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [PROFILE_WITHOUT_AVATAR] })
    updateChildAvatar.mockRejectedValue(new Error('network down'))

    renderChildHomePage({ initialActiveChildId: PROFILE_WITHOUT_AVATAR.id })

    fireEvent.click(await screen.findByRole('button', { name: TEXT.avatars.starLabel }))

    expect(await screen.findByText(TEXT.childSelection.saveError)).toBeInTheDocument()
    expect(screen.getByText(TEXT.childHome.avatarPickerHeading)).toBeInTheDocument()
  })

  it('reopens the picker when a child with an existing avatar clicks their own avatar', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    fireEvent.click(await screen.findByRole('button', { name: ACTIVE_PROFILE.name }))

    expect(screen.getByText(TEXT.childHome.avatarPickerHeading)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXT.childSelection.cancelButtonLabel }),
    ).toBeInTheDocument()
  })

  it('cancelling out of a reopened picker returns to the normal home view unchanged', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    fireEvent.click(await screen.findByRole('button', { name: ACTIVE_PROFILE.name }))
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.cancelButtonLabel }))

    expect(screen.queryByText(TEXT.childHome.avatarPickerHeading)).not.toBeInTheDocument()
    expect(updateChildAvatar).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: TEXT.childHome.switchChildButtonLabel }),
    ).toBeInTheDocument()
  })

  it('picking a different avatar from the reopened picker saves it and returns to the normal view', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })
    updateChildAvatar.mockResolvedValue({ ...ACTIVE_PROFILE, avatarId: 'unicorn' })

    renderChildHomePage()

    fireEvent.click(await screen.findByRole('button', { name: ACTIVE_PROFILE.name }))
    fireEvent.click(screen.getByRole('button', { name: TEXT.avatars.unicornLabel }))

    expect(updateChildAvatar).toHaveBeenCalledWith(ACTIVE_PROFILE.id, 'unicorn')
    expect(
      await screen.findByRole('button', { name: TEXT.childHome.switchChildButtonLabel }),
    ).toBeInTheDocument()
    expect(screen.queryByText(TEXT.childHome.avatarPickerHeading)).not.toBeInTheDocument()
  })
})

describe('ChildHomePage — responsive stations per row', () => {
  const ORIGINAL_INNER_WIDTH = window.innerWidth

  afterEach(() => {
    window.innerWidth = ORIGINAL_INNER_WIDTH
  })

  it('fits more stations per row (and scales lookahead with it) at a wide viewport', async () => {
    window.innerWidth = 1400
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    await screen.findByText(ACTIVE_PROFILE.name)

    // 6 per row at >=1280px; lookahead is always stationsPerRow * 2 - 1 = 11.
    expect(screen.getAllByRole('group')).toHaveLength(11)
  })

  it('fits even more per row at a very wide viewport', async () => {
    window.innerWidth = 1800
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    await screen.findByText(ACTIVE_PROFILE.name)

    // 8 per row at >=1600px; lookahead is always stationsPerRow * 2 - 1 = 15.
    expect(screen.getAllByRole('group')).toHaveLength(15)
  })

  it('keeps the default (narrower) 4-per-row layout at a typical laptop width', async () => {
    window.innerWidth = 1024
    fetchChildProfiles.mockResolvedValue({ childProfiles: [ACTIVE_PROFILE] })

    renderChildHomePage()

    await screen.findByText(ACTIVE_PROFILE.name)

    expect(screen.getAllByRole('group')).toHaveLength(7)
  })
})
