import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter, Routes, Route } from 'react-router'
import ParentZonePage from '../../src/pages/ParentZonePage'
import { ActiveChildProvider } from '../../src/context/ActiveChildProvider'
import { useActiveChild } from '../../src/context/useActiveChild'
import { TEXT } from '../../src/constants/text'
import { theme } from '../../src/styles/theme'
import {
  fetchChildProfiles,
  createChildProfile,
  updateChildProfile,
  archiveChildProfile,
  ChildProfileServiceError,
} from '../../src/services/childProfileService'
import { logout } from '../../src/services/authService'
import {
  fetchParentZoneStatus,
  lockParentZone,
  setParentPin,
} from '../../src/services/parentZoneService'

vi.mock('../../src/services/parentZoneService', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchParentZoneStatus: vi.fn(),
  unlockParentZone: vi.fn(),
  lockParentZone: vi.fn(),
  setParentPin: vi.fn(),
}))

vi.mock('../../src/services/childProfileService', () => ({
  fetchChildProfiles: vi.fn(),
  createChildProfile: vi.fn(),
  updateChildProfile: vi.fn(),
  archiveChildProfile: vi.fn(),
  ChildProfileServiceError: class ChildProfileServiceError extends Error {
    constructor(message, { status, body } = {}) {
      super(message)
      this.name = 'ChildProfileServiceError'
      this.status = status
      this.body = body
    }
  },
}))

vi.mock('../../src/services/authService', () => ({
  logout: vi.fn(),
}))

const GENERIC_PROFILES = [
  {
    id: 'profile-alpha',
    name: 'פרופיל אלפא',
    grammaticalGender: 'female',
    readingLevel: 'beginner',
    interests: [],
  },
  {
    id: 'profile-beta',
    name: 'פרופיל בטא',
    grammaticalGender: 'male',
    readingLevel: 'intermediate',
    interests: [],
  },
]

// Exposes the context's own activeChildId so tests can observe that logout
// actually clears it, without reaching into ActiveChildProvider internals.
function ActiveChildSentinel() {
  const { activeChildId } = useActiveChild()
  return <div data-testid="active-child-sentinel">{activeChildId ?? 'NONE'}</div>
}

function renderParentZonePage({ initialActiveChildId = 'profile-alpha' } = {}) {
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <ActiveChildProvider initialActiveChildId={initialActiveChildId}>
          <ActiveChildSentinel />
          <MemoryRouter initialEntries={['/parent-zone']}>
            <Routes>
              <Route path="/parent-zone" element={<ParentZonePage />} />
              <Route path="/child-home" element={<div>CHILD_HOME_SENTINEL</div>} />
              <Route path="/login" element={<div>LOGIN_SENTINEL</div>} />
              <Route
                path="/parent-zone/:childId/progress"
                element={<div>CHILD_PROGRESS_SENTINEL</div>}
              />
            </Routes>
          </MemoryRouter>
        </ActiveChildProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

function lockedError() {
  return new ChildProfileServiceError('Request failed with status 403', {
    status: 403,
    body: { errorCode: 'parent_zone_locked' },
  })
}

beforeEach(() => {
  // Most tests are about what happens inside an already-unlocked parent zone.
  fetchParentZoneStatus.mockReset().mockResolvedValue({ pinSet: true, unlocked: true })
  lockParentZone.mockReset()
  setParentPin.mockReset()
  fetchChildProfiles.mockReset()
  createChildProfile.mockReset()
  updateChildProfile.mockReset()
  archiveChildProfile.mockReset()
  logout.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ParentZonePage — gate hand-off', () => {
  it('shows no parent-zone content and fetches no profiles while the zone is locked', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })

    renderParentZonePage()

    expect(await screen.findByLabelText(TEXT.parentZone.pinFieldAriaLabel)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: TEXT.childSelection.addButtonLabel }),
    ).not.toBeInTheDocument()
    expect(fetchChildProfiles).not.toHaveBeenCalled()
  })

  it('fetches child profiles once the zone is unlocked', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })

    renderParentZonePage()

    await screen.findByRole('button', { name: TEXT.childSelection.addButtonLabel })
    expect(fetchChildProfiles).toHaveBeenCalled()
  })

  it('"נעילת חשבון" locks the session and returns to the PIN gate, hiding the profiles', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    lockParentZone.mockResolvedValue({ locked: true })
    renderParentZonePage()

    await screen.findByText(GENERIC_PROFILES[0].name)
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.lockButtonLabel }))

    expect(await screen.findByLabelText(TEXT.parentZone.pinFieldAriaLabel)).toBeInTheDocument()
    expect(lockParentZone).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(GENERIC_PROFILES[0].name)).not.toBeInTheDocument()
  })

  it('shows the localized lock error and stays unlocked when locking fails', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    lockParentZone.mockRejectedValue(new Error('network down'))
    renderParentZonePage()

    await screen.findByText(GENERIC_PROFILES[0].name)
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.lockButtonLabel }))

    expect(await screen.findByText(TEXT.parentZone.lockError)).toBeInTheDocument()
    expect(screen.getByText(GENERIC_PROFILES[0].name)).toBeInTheDocument()
  })

  it('returns to the PIN gate when deleting fails because the session expired', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    archiveChildProfile.mockRejectedValue(lockedError())
    renderParentZonePage()

    const deleteButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.deleteButtonLabel,
    })
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })
    fireEvent.click(deleteButtons[0])
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.confirmDeleteYesLabel }))

    expect(await screen.findByLabelText(TEXT.parentZone.pinFieldAriaLabel)).toBeInTheDocument()
    expect(screen.queryByText(TEXT.childSelection.deleteError)).not.toBeInTheDocument()
  })

  it('returns to the PIN gate when saving an edit fails because the session expired', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    updateChildProfile.mockRejectedValue(lockedError())
    renderParentZonePage()

    const editButtons = await screen.findAllByRole('button', { name: TEXT.childSelection.editButtonLabel })
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })
    fireEvent.click(editButtons[0])
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.saveButtonLabel }))

    expect(await screen.findByLabelText(TEXT.parentZone.pinFieldAriaLabel)).toBeInTheDocument()
    expect(screen.queryByText(TEXT.childSelection.saveError)).not.toBeInTheDocument()
  })

  it('changes the PIN with the current PIN and confirms it', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    setParentPin.mockResolvedValue({ pinSet: true, unlocked: true })
    renderParentZonePage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.parentZone.changePinButtonLabel }))
    fireEvent.change(screen.getByLabelText(TEXT.parentZone.currentPinFieldAriaLabel), {
      target: { value: '1234' },
    })
    fireEvent.change(screen.getByLabelText(TEXT.parentZone.newPinFieldAriaLabel), {
      target: { value: '5678' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.savePinButtonLabel }))

    expect(await screen.findByText(TEXT.parentZone.pinChangedMessage)).toBeInTheDocument()
    expect(setParentPin).toHaveBeenCalledWith({ newPin: '5678', currentPin: '1234' })
  })

  it('keeps the change-PIN form open with a localized error when the current PIN is wrong', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    setParentPin.mockRejectedValue(
      new ChildProfileServiceError('Request failed with status 403', {
        status: 403,
        body: { errorCode: 'parent_zone_invalid_credentials' },
      }),
    )
    renderParentZonePage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.parentZone.changePinButtonLabel }))
    fireEvent.change(screen.getByLabelText(TEXT.parentZone.currentPinFieldAriaLabel), {
      target: { value: '0000' },
    })
    fireEvent.change(screen.getByLabelText(TEXT.parentZone.newPinFieldAriaLabel), {
      target: { value: '5678' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.savePinButtonLabel }))

    expect(await screen.findByText(TEXT.parentZone.wrongCurrentPinMessage)).toBeInTheDocument()
    expect(screen.queryByText(TEXT.parentZone.pinChangedMessage)).not.toBeInTheDocument()
  })

  it('disables saving a new PIN until both PINs are exactly 4 digits', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    renderParentZonePage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.parentZone.changePinButtonLabel }))
    fireEvent.change(screen.getByLabelText(TEXT.parentZone.currentPinFieldAriaLabel), {
      target: { value: '123' },
    })
    fireEvent.change(screen.getByLabelText(TEXT.parentZone.newPinFieldAriaLabel), {
      target: { value: '5678' },
    })

    expect(screen.getByRole('button', { name: TEXT.parentZone.savePinButtonLabel })).toBeDisabled()
  })

  it('navigates back to /child-home from the unlocked parent zone', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })

    renderParentZonePage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.parentZone.backButtonLabel }))

    expect(await screen.findByText('CHILD_HOME_SENTINEL')).toBeInTheDocument()
  })
})

describe('ParentZonePage — profile management (behind the gate)', () => {
  it('shows the localized loading state while profiles resolve', async () => {
    fetchChildProfiles.mockReturnValue(new Promise(() => {}))

    renderParentZonePage()

    expect(await screen.findByText(TEXT.childSelection.loading)).toBeInTheDocument()
  })

  it('lists each child profile with an edit button, a delete button, and an add-child button', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    for (const profile of GENERIC_PROFILES) {
      expect(await screen.findByText(profile.name)).toBeInTheDocument()
    }
    expect(
      screen.getAllByRole('button', { name: TEXT.childSelection.editButtonLabel }),
    ).toHaveLength(GENERIC_PROFILES.length)
    expect(
      screen.getAllByRole('button', { name: TEXT.childSelection.deleteButtonLabel }),
    ).toHaveLength(GENERIC_PROFILES.length)
    expect(screen.getByRole('button', { name: TEXT.childSelection.addButtonLabel })).toBeInTheDocument()
  })

  it('navigates to the progress page for the right child when its progress button is clicked', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    await screen.findByText(GENERIC_PROFILES[0].name)

    const progressButtons = screen.getAllByRole('button', {
      name: TEXT.parentZone.viewProgressButtonLabel,
    })
    expect(progressButtons).toHaveLength(GENERIC_PROFILES.length)

    fireEvent.click(progressButtons[0])

    expect(await screen.findByText('CHILD_PROGRESS_SENTINEL')).toBeInTheDocument()
  })

  it('redirects to /login (not the generic error) when the profile fetch is unauthorized', async () => {
    fetchChildProfiles.mockRejectedValue(
      new ChildProfileServiceError('Request failed with status 401', { status: 401 }),
    )

    renderParentZonePage()

    expect(await screen.findByText('LOGIN_SENTINEL')).toBeInTheDocument()
  })

  it('shows the localized error state when fetching profiles fails for another reason', async () => {
    fetchChildProfiles.mockRejectedValue(new Error('network down'))

    renderParentZonePage()

    expect(await screen.findByText(TEXT.childSelection.error)).toBeInTheDocument()
  })

  it('edits a profile: submitting the form calls updateChildProfile and reflects the saved result', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    const updatedProfile = { ...GENERIC_PROFILES[0], name: 'שם מעודכן' }
    updateChildProfile.mockResolvedValue(updatedProfile)

    renderParentZonePage()

    const editButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.editButtonLabel,
    })
    fireEvent.click(editButtons[0])

    fireEvent.change(screen.getByPlaceholderText(TEXT.childSelection.nameFieldPlaceholder), {
      target: { value: 'שם מעודכן' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.saveButtonLabel }))

    expect(updateChildProfile).toHaveBeenCalledWith(
      GENERIC_PROFILES[0].id,
      expect.objectContaining({ name: 'שם מעודכן' }),
    )
    expect(await screen.findByText('שם מעודכן')).toBeInTheDocument()
  })

  it('adds a new child: submitting the add form calls createChildProfile and lists the result', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    const createdProfile = {
      id: 'new-child',
      name: 'ילד חדש',
      grammaticalGender: 'male',
      readingLevel: 'beginner',
      interests: [],
    }
    createChildProfile.mockResolvedValue(createdProfile)

    renderParentZonePage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.childSelection.addButtonLabel }))
    fireEvent.change(screen.getByPlaceholderText(TEXT.childSelection.nameFieldPlaceholder), {
      target: { value: 'ילד חדש' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.saveButtonLabel }))

    expect(createChildProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'ילד חדש' }))
    expect(await screen.findByText('ילד חדש')).toBeInTheDocument()
  })

  it('selects interests from the fixed list (not free text) when adding a new child', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    createChildProfile.mockResolvedValue({
      id: 'new-child',
      name: 'ילד חדש',
      grammaticalGender: 'male',
      readingLevel: 'beginner',
      interests: ['space', 'sports'],
    })

    renderParentZonePage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.childSelection.addButtonLabel }))
    fireEvent.change(screen.getByPlaceholderText(TEXT.childSelection.nameFieldPlaceholder), {
      target: { value: 'ילד חדש' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.interestSpaceLabel }))
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.interestSportsLabel }))
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.saveButtonLabel }))

    expect(createChildProfile).toHaveBeenCalledWith(
      expect.objectContaining({ interests: ['space', 'sports'] }),
    )
  })

  it('pre-selects a profile\'s existing interests when editing, and lets one be toggled off', async () => {
    const profileWithInterests = { ...GENERIC_PROFILES[0], interests: ['space'] }
    fetchChildProfiles.mockResolvedValue({ childProfiles: [profileWithInterests] })
    updateChildProfile.mockResolvedValue({ ...profileWithInterests, interests: [] })

    renderParentZonePage()

    fireEvent.click(
      await screen.findByRole('button', { name: TEXT.childSelection.editButtonLabel }),
    )

    const spaceChip = screen.getByRole('button', { name: TEXT.childSelection.interestSpaceLabel })
    expect(spaceChip).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(spaceChip)
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.saveButtonLabel }))

    expect(updateChildProfile).toHaveBeenCalledWith(
      profileWithInterests.id,
      expect.objectContaining({ interests: [] }),
    )
  })

  it('hides the add-child button while a profile is being edited', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    const editButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.editButtonLabel,
    })
    fireEvent.click(editButtons[0])

    expect(
      screen.queryByRole('button', { name: TEXT.childSelection.addButtonLabel }),
    ).not.toBeInTheDocument()
  })

  it('closes the add-child form when editing a profile is started instead, instead of showing both at once', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    fireEvent.click(await screen.findByRole('button', { name: TEXT.childSelection.addButtonLabel }))
    expect(screen.getAllByPlaceholderText(TEXT.childSelection.nameFieldPlaceholder)).toHaveLength(1)

    const editButtons = screen.getAllByRole('button', { name: TEXT.childSelection.editButtonLabel })
    fireEvent.click(editButtons[0])

    expect(screen.getAllByPlaceholderText(TEXT.childSelection.nameFieldPlaceholder)).toHaveLength(1)
    expect(screen.getByDisplayValue(GENERIC_PROFILES[0].name)).toBeInTheDocument()
  })

  it('shows the localized save error and keeps the form open when updating a profile fails', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    updateChildProfile.mockRejectedValue(new Error('save failed'))

    renderParentZonePage()

    const editButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.editButtonLabel,
    })
    fireEvent.click(editButtons[0])
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.saveButtonLabel }))

    expect(await screen.findByText(TEXT.childSelection.saveError)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXT.childSelection.cancelButtonLabel }),
    ).toBeInTheDocument()
  })
})

describe('ParentZonePage — deleting (archiving) a child', () => {
  it('clicking delete shows an inline confirmation instead of deleting immediately', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    const deleteButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.deleteButtonLabel,
    })
    fireEvent.click(deleteButtons[0])

    expect(archiveChildProfile).not.toHaveBeenCalled()
    expect(
      screen.getByText(`${TEXT.childSelection.confirmDeleteQuestion} ${GENERIC_PROFILES[0].name}?`),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXT.childSelection.confirmDeleteYesLabel }),
    ).toBeInTheDocument()
  })

  it('cancelling the confirmation closes it without calling archiveChildProfile', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    const deleteButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.deleteButtonLabel,
    })
    fireEvent.click(deleteButtons[0])
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.cancelButtonLabel }))

    expect(archiveChildProfile).not.toHaveBeenCalled()
    expect(
      await screen.findAllByRole('button', { name: TEXT.childSelection.deleteButtonLabel }),
    ).toHaveLength(GENERIC_PROFILES.length)
  })

  it('confirming calls archiveChildProfile and removes the profile from the list', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    archiveChildProfile.mockResolvedValue({ success: true })

    renderParentZonePage()

    const deleteButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.deleteButtonLabel,
    })
    fireEvent.click(deleteButtons[0])
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.confirmDeleteYesLabel }))

    expect(archiveChildProfile).toHaveBeenCalledWith(GENERIC_PROFILES[0].id)
    await screen.findByRole('button', { name: TEXT.childSelection.addButtonLabel })
    expect(screen.queryByText(GENERIC_PROFILES[0].name)).not.toBeInTheDocument()
    expect(screen.getByText(GENERIC_PROFILES[1].name)).toBeInTheDocument()
  })

  it('shows the localized delete error and keeps the confirmation open when archiving fails', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })
    archiveChildProfile.mockRejectedValue(new Error('network down'))

    renderParentZonePage()

    const deleteButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.deleteButtonLabel,
    })
    fireEvent.click(deleteButtons[0])
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.confirmDeleteYesLabel }))

    expect(await screen.findByText(TEXT.childSelection.deleteError)).toBeInTheDocument()
    expect(
      screen.getByText(`${TEXT.childSelection.confirmDeleteQuestion} ${GENERIC_PROFILES[0].name}?`),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXT.childSelection.confirmDeleteYesLabel }),
    ).toBeInTheDocument()
  })

  it('hides the add-child button while a delete confirmation is open', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    const deleteButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.deleteButtonLabel,
    })
    fireEvent.click(deleteButtons[0])

    expect(
      screen.queryByRole('button', { name: TEXT.childSelection.addButtonLabel }),
    ).not.toBeInTheDocument()
  })

  it('closes an open delete confirmation when editing a different profile is started instead', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderParentZonePage()

    const deleteButtons = await screen.findAllByRole('button', {
      name: TEXT.childSelection.deleteButtonLabel,
    })
    fireEvent.click(deleteButtons[0])
    expect(
      screen.getByText(`${TEXT.childSelection.confirmDeleteQuestion} ${GENERIC_PROFILES[0].name}?`),
    ).toBeInTheDocument()

    // profile[0]'s own edit button is gone while its delete is being
    // confirmed — the only one left is profile[1]'s.
    fireEvent.click(screen.getByRole('button', { name: TEXT.childSelection.editButtonLabel }))

    expect(
      screen.queryByText(`${TEXT.childSelection.confirmDeleteQuestion} ${GENERIC_PROFILES[0].name}?`),
    ).not.toBeInTheDocument()
    expect(screen.getByDisplayValue(GENERIC_PROFILES[1].name)).toBeInTheDocument()
  })
})

describe('ParentZonePage — logout', () => {
  it('disables the logout button and shows the logging-out label while the request is in flight', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    logout.mockReturnValue(new Promise(() => {}))

    renderParentZonePage()

    const logoutButton = await screen.findByRole('button', {
      name: TEXT.parentZone.logoutButtonLabel,
    })
    fireEvent.click(logoutButton)

    const pendingButton = await screen.findByRole('button', {
      name: TEXT.parentZone.loggingOutLabel,
    })
    expect(pendingButton).toBeDisabled()
  })

  it('clears the active child and navigates to /login when logout succeeds', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    logout.mockResolvedValue({ success: true })

    renderParentZonePage()

    expect(screen.getByTestId('active-child-sentinel')).toHaveTextContent('profile-alpha')

    fireEvent.click(
      await screen.findByRole('button', { name: TEXT.parentZone.logoutButtonLabel }),
    )

    expect(await screen.findByText('LOGIN_SENTINEL')).toBeInTheDocument()
    expect(screen.getByTestId('active-child-sentinel')).toHaveTextContent('NONE')
  })

  it('shows the localized error and keeps the active child when logout fails', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })
    logout.mockRejectedValue(new Error('network down'))

    renderParentZonePage()

    fireEvent.click(
      await screen.findByRole('button', { name: TEXT.parentZone.logoutButtonLabel }),
    )

    expect(await screen.findByText(TEXT.parentZone.logoutError)).toBeInTheDocument()
    expect(screen.queryByText('LOGIN_SENTINEL')).not.toBeInTheDocument()
    expect(screen.getByTestId('active-child-sentinel')).toHaveTextContent('profile-alpha')
    expect(
      screen.getByRole('button', { name: TEXT.parentZone.logoutButtonLabel }),
    ).not.toBeDisabled()
  })
})
