import { useState } from 'react'
import { TEXT } from '../constants/text'
import {
  setParentPin,
  hasErrorCode,
  isParentZoneLockedError,
  PARENT_ZONE_ERROR_CODES,
} from '../services/parentZoneService'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import { ProfileForm, FormActions } from '../styles/ParentZonePageStyle'

const PIN_PATTERN = /^\d{4}$/

function describeFailure(caughtError) {
  if (hasErrorCode(caughtError, PARENT_ZONE_ERROR_CODES.invalidCredentials)) {
    return TEXT.parentZone.wrongCurrentPinMessage
  }

  if (hasErrorCode(caughtError, PARENT_ZONE_ERROR_CODES.tooManyAttempts)) {
    return TEXT.parentZone.tooManyAttemptsMessage
  }

  return TEXT.parentZone.gateError
}

function ParentPinChangeForm({ onChanged, onCancel, onSessionExpired }) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    setParentPin({ newPin, currentPin })
      .then(onChanged)
      .catch((caughtError) => {
        if (isParentZoneLockedError(caughtError)) {
          onSessionExpired()
          return
        }

        setErrorMessage(describeFailure(caughtError))
        setIsSaving(false)
      })
  }

  return (
    <ProfileForm onSubmit={handleSubmit}>
      <TextField
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        value={currentPin}
        onChange={(event) => setCurrentPin(event.target.value)}
        placeholder={TEXT.parentZone.currentPinFieldPlaceholder}
        ariaLabel={TEXT.parentZone.currentPinFieldAriaLabel}
        disabled={isSaving}
      />
      <TextField
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        value={newPin}
        onChange={(event) => setNewPin(event.target.value)}
        placeholder={TEXT.parentZone.newPinFieldPlaceholder}
        ariaLabel={TEXT.parentZone.newPinFieldAriaLabel}
        disabled={isSaving}
      />
      {errorMessage && <FeedbackMessage tone="error">{errorMessage}</FeedbackMessage>}
      <FormActions>
        <Button
          type="submit"
          disabled={isSaving || !PIN_PATTERN.test(currentPin) || !PIN_PATTERN.test(newPin)}
        >
          {TEXT.parentZone.savePinButtonLabel}
        </Button>
        <Button type="button" variant="muted" onClick={onCancel} disabled={isSaving}>
          {TEXT.childSelection.cancelButtonLabel}
        </Button>
      </FormActions>
    </ProfileForm>
  )
}

export default ParentPinChangeForm
