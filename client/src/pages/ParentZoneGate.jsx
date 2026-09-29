import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TEXT } from '../constants/text'
import {
  fetchParentZoneStatus,
  unlockParentZone,
  setParentPin,
  hasErrorCode,
  PARENT_ZONE_ERROR_CODES,
} from '../services/parentZoneService'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import { AuthForm } from '../styles/AuthPageStyle'
import { GateQuestion } from '../styles/ParentZonePageStyle'

const PIN_PATTERN = /^\d{4}$/

const GATE_MODE = {
  checking: 'checking',
  unavailable: 'unavailable',
  enterPin: 'enterPin',
  setPin: 'setPin',
  forgotPin: 'forgotPin',
}

function isValidPin(value) {
  return PIN_PATTERN.test(value)
}

function PinField({ value, onChange, placeholder, ariaLabel, disabled }) {
  return (
    <TextField
      type="password"
      inputMode="numeric"
      maxLength={4}
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      disabled={disabled}
    />
  )
}

function ParentZoneGate({ onUnlocked }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(GATE_MODE.checking)
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // StrictMode can resolve a stale fetch after the cleanup has run.
    let ignore = false

    fetchParentZoneStatus()
      .then((status) => {
        if (ignore) {
          return
        }

        if (status.unlocked) {
          onUnlocked()
          return
        }

        setMode(status.pinSet ? GATE_MODE.enterPin : GATE_MODE.setPin)
      })
      .catch((caughtError) => {
        if (ignore) {
          return
        }

        if (caughtError.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        setMode(GATE_MODE.unavailable)
      })

    return () => {
      ignore = true
    }
  }, [navigate, onUnlocked])

  function switchMode(nextMode) {
    setMode(nextMode)
    setPin('')
    setPassword('')
    setErrorMessage(null)
  }

  function describeFailure(caughtError, wrongSecretMessage) {
    if (hasErrorCode(caughtError, PARENT_ZONE_ERROR_CODES.invalidCredentials)) {
      return wrongSecretMessage
    }

    if (hasErrorCode(caughtError, PARENT_ZONE_ERROR_CODES.tooManyAttempts)) {
      return TEXT.parentZone.tooManyAttemptsMessage
    }

    return TEXT.parentZone.gateError
  }

  function attempt(request, wrongSecretMessage) {
    setIsSubmitting(true)
    setErrorMessage(null)

    request()
      .then(onUnlocked)
      .catch((caughtError) => {
        if (caughtError.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        setErrorMessage(describeFailure(caughtError, wrongSecretMessage))
        setPin('')
        setIsSubmitting(false)
      })
  }

  function handleUnlockSubmit(event) {
    event.preventDefault()
    attempt(() => unlockParentZone(pin), TEXT.parentZone.wrongPinMessage)
  }

  function handleSetPinSubmit(event) {
    event.preventDefault()
    attempt(() => setParentPin({ newPin: pin, password }), TEXT.parentZone.wrongPasswordMessage)
  }

  if (mode === GATE_MODE.checking) {
    return <FeedbackMessage tone="info">{TEXT.parentZone.gateChecking}</FeedbackMessage>
  }

  if (mode === GATE_MODE.unavailable) {
    return <FeedbackMessage tone="error">{TEXT.parentZone.gateUnavailableMessage}</FeedbackMessage>
  }

  if (mode === GATE_MODE.enterPin) {
    return (
      <>
        <AuthForm onSubmit={handleUnlockSubmit} noValidate>
          <GateQuestion>{TEXT.parentZone.enterPinPrompt}</GateQuestion>
          <PinField
            value={pin}
            onChange={setPin}
            placeholder={TEXT.parentZone.pinFieldPlaceholder}
            ariaLabel={TEXT.parentZone.pinFieldAriaLabel}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting || !isValidPin(pin)}>
            {TEXT.parentZone.gateSubmitButtonLabel}
          </Button>
        </AuthForm>
        {errorMessage && <FeedbackMessage tone="error">{errorMessage}</FeedbackMessage>}
        <Button variant="muted" onClick={() => switchMode(GATE_MODE.forgotPin)} disabled={isSubmitting}>
          {TEXT.parentZone.forgotPinButtonLabel}
        </Button>
      </>
    )
  }

  const prompt =
    mode === GATE_MODE.setPin ? TEXT.parentZone.setPinPrompt : TEXT.parentZone.forgotPinPrompt

  return (
    <>
      <AuthForm onSubmit={handleSetPinSubmit} noValidate>
        <GateQuestion>{prompt}</GateQuestion>
        <TextField
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={TEXT.parentZone.passwordFieldPlaceholder}
          ariaLabel={TEXT.parentZone.passwordFieldAriaLabel}
          disabled={isSubmitting}
        />
        <PinField
          value={pin}
          onChange={setPin}
          placeholder={TEXT.parentZone.newPinFieldPlaceholder}
          ariaLabel={TEXT.parentZone.newPinFieldAriaLabel}
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting || password.length === 0 || !isValidPin(pin)}>
          {TEXT.parentZone.savePinButtonLabel}
        </Button>
      </AuthForm>
      {errorMessage && <FeedbackMessage tone="error">{errorMessage}</FeedbackMessage>}
      {mode === GATE_MODE.forgotPin && (
        <Button variant="muted" onClick={() => switchMode(GATE_MODE.enterPin)} disabled={isSubmitting}>
          {TEXT.parentZone.backToPinButtonLabel}
        </Button>
      )}
    </>
  )
}

export default ParentZoneGate
