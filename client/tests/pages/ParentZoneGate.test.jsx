import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter, Routes, Route } from 'react-router'
import ParentZoneGate from '../../src/pages/ParentZoneGate'
import { TEXT } from '../../src/constants/text'
import { theme } from '../../src/styles/theme'
import {
  fetchParentZoneStatus,
  unlockParentZone,
  setParentPin,
  ParentZoneServiceError,
} from '../../src/services/parentZoneService'

vi.mock('../../src/services/parentZoneService', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchParentZoneStatus: vi.fn(),
  unlockParentZone: vi.fn(),
  setParentPin: vi.fn(),
}))

const onUnlocked = vi.fn()

function renderGate() {
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/gate']}>
          <Routes>
            <Route path="/gate" element={<ParentZoneGate onUnlocked={onUnlocked} />} />
            <Route path="/login" element={<div>LOGIN_SENTINEL</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </StrictMode>,
  )
}

function serviceError(status, errorCode) {
  return new ParentZoneServiceError(`Request failed with status ${status}`, {
    status,
    body: errorCode ? { errorCode } : null,
  })
}

function typeInto(ariaLabel, value) {
  fireEvent.change(screen.getByLabelText(ariaLabel), { target: { value } })
}

function pinInput() {
  return screen.getByLabelText(TEXT.parentZone.pinFieldAriaLabel)
}

beforeEach(() => {
  onUnlocked.mockReset()
  fetchParentZoneStatus.mockReset()
  unlockParentZone.mockReset()
  setParentPin.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ParentZoneGate — deciding what to show', () => {
  it('shows a checking state until the status arrives', () => {
    fetchParentZoneStatus.mockReturnValue(new Promise(() => {}))

    renderGate()

    expect(screen.getByText(TEXT.parentZone.gateChecking)).toBeInTheDocument()
  })

  it('unlocks straight away, with no form, when the session is already unlocked', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: true })

    renderGate()

    await vi.waitFor(() => expect(onUnlocked).toHaveBeenCalled())
    expect(screen.queryByLabelText(TEXT.parentZone.pinFieldAriaLabel)).not.toBeInTheDocument()
  })

  it('asks for the PIN when one is set and the session is locked', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })

    renderGate()

    expect(await screen.findByText(TEXT.parentZone.enterPinPrompt)).toBeInTheDocument()
    expect(onUnlocked).not.toHaveBeenCalled()
  })

  it('offers first-time PIN setup, which asks for the account password, when no PIN exists', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: false, unlocked: false })

    renderGate()

    expect(await screen.findByText(TEXT.parentZone.setPinPrompt)).toBeInTheDocument()
    expect(screen.getByLabelText(TEXT.parentZone.passwordFieldAriaLabel)).toBeInTheDocument()
    expect(screen.queryByText(TEXT.parentZone.forgotPinButtonLabel)).not.toBeInTheDocument()
  })

  it('redirects to /login when the status request is unauthorized', async () => {
    fetchParentZoneStatus.mockRejectedValue(serviceError(401))

    renderGate()

    expect(await screen.findByText('LOGIN_SENTINEL')).toBeInTheDocument()
  })

  it('shows a localized error, with no form, when the status cannot be loaded', async () => {
    fetchParentZoneStatus.mockRejectedValue(new Error('network down'))

    renderGate()

    expect(await screen.findByText(TEXT.parentZone.gateUnavailableMessage)).toBeInTheDocument()
    expect(screen.queryByLabelText(TEXT.parentZone.pinFieldAriaLabel)).not.toBeInTheDocument()
  })
})

describe('ParentZoneGate — entering the PIN', () => {
  beforeEach(() => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })
  })

  it('keeps the submit button disabled until the PIN is exactly 4 digits', async () => {
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)
    const submit = screen.getByRole('button', { name: TEXT.parentZone.gateSubmitButtonLabel })

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '123')
    expect(submit).toBeDisabled()

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '12a4')
    expect(submit).toBeDisabled()

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '1234')
    expect(submit).toBeEnabled()
  })

  it('masks the PIN and asks for a numeric keyboard', async () => {
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)

    expect(pinInput()).toHaveAttribute('type', 'password')
    expect(pinInput()).toHaveAttribute('inputmode', 'numeric')
    expect(pinInput()).toHaveAttribute('maxlength', '4')
  })

  it('unlocks with the typed PIN', async () => {
    unlockParentZone.mockResolvedValue({ unlocked: true })
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '1234')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.gateSubmitButtonLabel }))

    await vi.waitFor(() => expect(onUnlocked).toHaveBeenCalled())
    expect(unlockParentZone).toHaveBeenCalledWith('1234')
  })

  it('shows the wrong-PIN message, clears the field and does not unlock', async () => {
    unlockParentZone.mockRejectedValue(serviceError(403, 'parent_zone_invalid_credentials'))
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '9999')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.gateSubmitButtonLabel }))

    expect(await screen.findByText(TEXT.parentZone.wrongPinMessage)).toBeInTheDocument()
    expect(pinInput()).toHaveValue('')
    expect(onUnlocked).not.toHaveBeenCalled()
  })

  it('shows the too-many-attempts message when the server has locked the parent out', async () => {
    unlockParentZone.mockRejectedValue(serviceError(429, 'parent_zone_too_many_attempts'))
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '1234')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.gateSubmitButtonLabel }))

    expect(await screen.findByText(TEXT.parentZone.tooManyAttemptsMessage)).toBeInTheDocument()
    expect(onUnlocked).not.toHaveBeenCalled()
  })

  it('shows the generic error for any other failure', async () => {
    unlockParentZone.mockRejectedValue(new Error('network down'))
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '1234')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.gateSubmitButtonLabel }))

    expect(await screen.findByText(TEXT.parentZone.gateError)).toBeInTheDocument()
  })

  it('redirects to /login when unlocking reports the login has expired', async () => {
    unlockParentZone.mockRejectedValue(serviceError(401, 'authentication_required'))
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)

    typeInto(TEXT.parentZone.pinFieldAriaLabel, '1234')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.gateSubmitButtonLabel }))

    expect(await screen.findByText('LOGIN_SENTINEL')).toBeInTheDocument()
  })
})

describe('ParentZoneGate — choosing a PIN with the account password', () => {
  it('first-time setup sends the new PIN with the password and unlocks', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: false, unlocked: false })
    setParentPin.mockResolvedValue({ pinSet: true, unlocked: true })
    renderGate()
    await screen.findByText(TEXT.parentZone.setPinPrompt)

    typeInto(TEXT.parentZone.passwordFieldAriaLabel, 'correct-horse')
    typeInto(TEXT.parentZone.newPinFieldAriaLabel, '1234')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.savePinButtonLabel }))

    await vi.waitFor(() => expect(onUnlocked).toHaveBeenCalled())
    expect(setParentPin).toHaveBeenCalledWith({ newPin: '1234', password: 'correct-horse' })
  })

  it('keeps the save button disabled until there is a password and a 4-digit PIN', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: false, unlocked: false })
    renderGate()
    await screen.findByText(TEXT.parentZone.setPinPrompt)
    const save = screen.getByRole('button', { name: TEXT.parentZone.savePinButtonLabel })

    typeInto(TEXT.parentZone.newPinFieldAriaLabel, '1234')
    expect(save).toBeDisabled()

    typeInto(TEXT.parentZone.passwordFieldAriaLabel, 'correct-horse')
    expect(save).toBeEnabled()

    typeInto(TEXT.parentZone.newPinFieldAriaLabel, '12')
    expect(save).toBeDisabled()
  })

  it('shows the wrong-password message when the password is rejected', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: false, unlocked: false })
    setParentPin.mockRejectedValue(serviceError(403, 'parent_zone_invalid_credentials'))
    renderGate()
    await screen.findByText(TEXT.parentZone.setPinPrompt)

    typeInto(TEXT.parentZone.passwordFieldAriaLabel, 'wrong')
    typeInto(TEXT.parentZone.newPinFieldAriaLabel, '1234')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.savePinButtonLabel }))

    expect(await screen.findByText(TEXT.parentZone.wrongPasswordMessage)).toBeInTheDocument()
    expect(onUnlocked).not.toHaveBeenCalled()
  })

  it('"שכחתי את הקוד" switches to the password form, and back returns to the PIN form', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)

    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.forgotPinButtonLabel }))

    expect(screen.getByText(TEXT.parentZone.forgotPinPrompt)).toBeInTheDocument()
    expect(screen.getByLabelText(TEXT.parentZone.passwordFieldAriaLabel)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.backToPinButtonLabel }))

    expect(screen.getByText(TEXT.parentZone.enterPinPrompt)).toBeInTheDocument()
  })

  it('does not carry a half-typed PIN or an error across the mode switch', async () => {
    fetchParentZoneStatus.mockResolvedValue({ pinSet: true, unlocked: false })
    unlockParentZone.mockRejectedValue(serviceError(403, 'parent_zone_invalid_credentials'))
    renderGate()
    await screen.findByText(TEXT.parentZone.enterPinPrompt)
    typeInto(TEXT.parentZone.pinFieldAriaLabel, '9999')
    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.gateSubmitButtonLabel }))
    await screen.findByText(TEXT.parentZone.wrongPinMessage)

    fireEvent.click(screen.getByRole('button', { name: TEXT.parentZone.forgotPinButtonLabel }))

    expect(screen.queryByText(TEXT.parentZone.wrongPinMessage)).not.toBeInTheDocument()
    expect(screen.getByLabelText(TEXT.parentZone.newPinFieldAriaLabel)).toHaveValue('')
  })
})
