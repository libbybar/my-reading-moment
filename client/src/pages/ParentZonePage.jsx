import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { TEXT } from '../constants/text'
import {
  fetchChildProfiles,
  createChildProfile,
  updateChildProfile,
  archiveChildProfile,
  ChildProfileServiceError,
} from '../services/childProfileService'
import { logout } from '../services/authService'
import { lockParentZone, isParentZoneLockedError } from '../services/parentZoneService'
import { useActiveChild } from '../context/useActiveChild'
import { getChildAvatar } from '../constants/childAvatars'
import { INTERESTS } from '../constants/interests'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import SelectField from '../components/ui/SelectField'
import ToggleChipGroup from '../components/ui/ToggleChipGroup'
import ConfirmAction from '../components/ui/ConfirmAction'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import ParentZoneGate from './ParentZoneGate'
import ParentPinChangeForm from './ParentPinChangeForm'
import { AuthCard, AuthHeading } from '../styles/AuthPageStyle'
import {
  ProfileList,
  ProfileRow,
  ProfileRowIdentity,
  ProfileRowAvatar,
  ProfileRowActions,
  ProfileName,
  ProfileForm,
  FormActions,
  AddChildButtonWrapper,
  FooterActions,
} from '../styles/ParentZonePageStyle'

const INTEREST_OPTIONS = INTERESTS.map(({ value, labelKey, Icon }) => ({
  value,
  label: TEXT.childSelection[labelKey],
  Icon,
}))

function ChildProfileForm({ initialValues = {}, onSave, onCancel, isSaving, error }) {
  const [name, setName] = useState(initialValues.name ?? '')
  const [grammaticalGender, setGrammaticalGender] = useState(
    initialValues.grammaticalGender ?? 'female',
  )
  const [readingLevel, setReadingLevel] = useState(initialValues.readingLevel ?? 'beginner')
  const [interests, setInterests] = useState(initialValues.interests ?? [])

  function handleToggleInterest(value) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((interest) => interest !== value) : [...prev, value],
    )
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSave({ name, grammaticalGender, readingLevel, interests })
  }

  return (
    <ProfileForm onSubmit={handleSubmit}>
      <TextField
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={TEXT.childSelection.nameFieldPlaceholder}
        ariaLabel={TEXT.childSelection.nameFieldPlaceholder}
        disabled={isSaving}
      />
      <SelectField
        value={grammaticalGender}
        onChange={(event) => setGrammaticalGender(event.target.value)}
        disabled={isSaving}
        ariaLabel={TEXT.childSelection.genderFieldLabel}
        options={[
          { value: 'female', label: TEXT.childSelection.genderFemaleOption },
          { value: 'male', label: TEXT.childSelection.genderMaleOption },
        ]}
      />
      <SelectField
        value={readingLevel}
        onChange={(event) => setReadingLevel(event.target.value)}
        disabled={isSaving}
        ariaLabel={TEXT.childSelection.readingLevelFieldLabel}
        options={[
          { value: 'beginner', label: TEXT.childSelection.readingLevelBeginnerOption },
          { value: 'intermediate', label: TEXT.childSelection.readingLevelIntermediateOption },
          { value: 'advanced', label: TEXT.childSelection.readingLevelAdvancedOption },
        ]}
      />
      <ToggleChipGroup
        options={INTEREST_OPTIONS}
        selectedValues={interests}
        onToggle={handleToggleInterest}
        disabled={isSaving}
        ariaLabel={TEXT.childSelection.interestsFieldLabel}
      />
      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}
      <FormActions>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? TEXT.childSelection.savingLabel : TEXT.childSelection.saveButtonLabel}
        </Button>
        <Button type="button" variant="muted" onClick={onCancel} disabled={isSaving}>
          {TEXT.childSelection.cancelButtonLabel}
        </Button>
      </FormActions>
    </ProfileForm>
  )
}

function ParentZonePage() {
  const navigate = useNavigate()
  const { selectActiveChild } = useActiveChild()
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isChangingPin, setIsChangingPin] = useState(false)
  const [pinChanged, setPinChanged] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [lockError, setLockError] = useState(null)

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)

  const [childProfiles, setChildProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [profilesError, setProfilesError] = useState(null)
  const [editingChildId, setEditingChildId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmingDeleteChildId, setConfirmingDeleteChildId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Only one add/edit/delete-confirm flow may own the shared save/error state.
  const isAnyActionInProgress = isAdding || Boolean(editingChildId) || Boolean(confirmingDeleteChildId)

  // Stable identity: the gate's status effect depends on it.
  const handleUnlocked = useCallback(() => {
    setIsUnlocked(true)
  }, [])

  // Also the path for a session that expired while the page was open.
  function returnToGate() {
    setIsUnlocked(false)
    setChildProfiles([])
    setLoadingProfiles(true)
    setProfilesError(null)
    setEditingChildId(null)
    setIsAdding(false)
    setConfirmingDeleteChildId(null)
    setIsChangingPin(false)
    setPinChanged(false)
    setSaveError(null)
    setDeleteError(null)
    setIsLocking(false)
  }

  function failedBecauseLocked(caughtError) {
    if (!isParentZoneLockedError(caughtError)) {
      return false
    }

    returnToGate()
    return true
  }

  function handleLock() {
    setIsLocking(true)
    setLockError(null)

    lockParentZone()
      .then(returnToGate)
      .catch(() => {
        setLockError(TEXT.parentZone.lockError)
        setIsLocking(false)
      })
  }

  useEffect(() => {
    if (!isUnlocked) {
      return undefined
    }

    // StrictMode can resolve a stale fetch after the cleanup has run.
    let ignore = false

    fetchChildProfiles()
      .then((data) => {
        if (ignore) {
          return
        }

        setChildProfiles(data.childProfiles)
      })
      .catch((caughtError) => {
        if (ignore) {
          return
        }

        if (caughtError instanceof ChildProfileServiceError && caughtError.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        setProfilesError(TEXT.childSelection.error)
      })
      .finally(() => {
        if (!ignore) {
          setLoadingProfiles(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [isUnlocked, navigate])

  function handleSaveNewChild(values) {
    setIsSaving(true)
    setSaveError(null)

    createChildProfile(values)
      .then((createdProfile) => {
        setChildProfiles((prev) => [...prev, createdProfile])
        setIsAdding(false)
      })
      .catch((caughtError) => {
        if (failedBecauseLocked(caughtError)) {
          return
        }

        setSaveError(TEXT.childSelection.saveError)
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  function handleDeleteChild(profileId) {
    setIsDeleting(true)
    setDeleteError(null)

    archiveChildProfile(profileId)
      .then(() => {
        setChildProfiles((prev) => prev.filter((profile) => profile.id !== profileId))
        setConfirmingDeleteChildId(null)
      })
      .catch((caughtError) => {
        if (failedBecauseLocked(caughtError)) {
          return
        }

        setDeleteError(TEXT.childSelection.deleteError)
      })
      .finally(() => {
        setIsDeleting(false)
      })
  }

  function handleLogout() {
    setIsLoggingOut(true)
    setLogoutError(null)

    logout()
      .then(() => {
        // Clears the in-memory active child so a different parent logging
        // in on the same tab never inherits it.
        selectActiveChild(null)
        navigate('/login', { replace: true })
      })
      .catch(() => {
        setLogoutError(TEXT.parentZone.logoutError)
        setIsLoggingOut(false)
      })
  }

  function handleSaveEditedChild(profileId, values) {
    setIsSaving(true)
    setSaveError(null)

    updateChildProfile(profileId, values)
      .then((updatedProfile) => {
        setChildProfiles((prev) =>
          prev.map((profile) => (profile.id === profileId ? updatedProfile : profile)),
        )
        setEditingChildId(null)
      })
      .catch((caughtError) => {
        if (failedBecauseLocked(caughtError)) {
          return
        }

        setSaveError(TEXT.childSelection.saveError)
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  return (
    <PageShell>
      <AuthCard>
        <AuthHeading>{TEXT.parentZone.heading}</AuthHeading>

        {!isUnlocked && <ParentZoneGate onUnlocked={handleUnlocked} />}

        {isUnlocked && (
          <>
            {loadingProfiles && (
              <FeedbackMessage tone="info">{TEXT.childSelection.loading}</FeedbackMessage>
            )}

            {!loadingProfiles && profilesError && (
              <FeedbackMessage tone="error">{profilesError}</FeedbackMessage>
            )}

            {!loadingProfiles && !profilesError && (
              <ProfileList>
                {childProfiles.map((profile) => {
                  if (editingChildId === profile.id) {
                    return (
                      <ChildProfileForm
                        key={profile.id}
                        initialValues={profile}
                        onSave={(values) => handleSaveEditedChild(profile.id, values)}
                        onCancel={() => {
                          setEditingChildId(null)
                          setSaveError(null)
                        }}
                        isSaving={isSaving}
                        error={saveError}
                      />
                    )
                  }

                  if (confirmingDeleteChildId === profile.id) {
                    return (
                      <div key={profile.id}>
                        <ConfirmAction
                          message={`${TEXT.childSelection.confirmDeleteQuestion} ${profile.name}?`}
                          confirmLabel={TEXT.childSelection.confirmDeleteYesLabel}
                          confirmingLabel={TEXT.childSelection.deletingLabel}
                          cancelLabel={TEXT.childSelection.cancelButtonLabel}
                          isConfirming={isDeleting}
                          onConfirm={() => handleDeleteChild(profile.id)}
                          onCancel={() => {
                            setConfirmingDeleteChildId(null)
                            setDeleteError(null)
                          }}
                        />
                        {deleteError && <FeedbackMessage tone="error">{deleteError}</FeedbackMessage>}
                      </div>
                    )
                  }

                  return (
                    <ProfileRow key={profile.id}>
                      <ProfileRowIdentity>
                        <ProfileRowAvatar aria-hidden="true">
                          {getChildAvatar(profile)}
                        </ProfileRowAvatar>
                        <ProfileName>{profile.name}</ProfileName>
                      </ProfileRowIdentity>
                      <ProfileRowActions>
                        <Button
                          variant="muted"
                          onClick={() => navigate(`/parent-zone/${profile.id}/progress`)}
                        >
                          {TEXT.parentZone.viewProgressButtonLabel}
                        </Button>
                        <Button
                          variant="muted"
                          onClick={() => {
                            setEditingChildId(profile.id)
                            setIsAdding(false)
                            setConfirmingDeleteChildId(null)
                            setSaveError(null)
                          }}
                        >
                          {TEXT.childSelection.editButtonLabel}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setConfirmingDeleteChildId(profile.id)
                            setEditingChildId(null)
                            setIsAdding(false)
                            setDeleteError(null)
                          }}
                        >
                          {TEXT.childSelection.deleteButtonLabel}
                        </Button>
                      </ProfileRowActions>
                    </ProfileRow>
                  )
                })}
              </ProfileList>
            )}

            {!loadingProfiles && !profilesError && !isAnyActionInProgress && (
              <AddChildButtonWrapper>
                <Button
                  onClick={() => {
                    setIsAdding(true)
                    setSaveError(null)
                  }}
                >
                  <Plus size={16} aria-hidden="true" />
                  {TEXT.childSelection.addButtonLabel}
                </Button>
              </AddChildButtonWrapper>
            )}

            {!loadingProfiles && !profilesError && isAdding && (
              <ChildProfileForm
                onSave={handleSaveNewChild}
                onCancel={() => {
                  setIsAdding(false)
                  setSaveError(null)
                }}
                isSaving={isSaving}
                error={saveError}
              />
            )}

            {isChangingPin && (
              <ParentPinChangeForm
                onChanged={() => {
                  setIsChangingPin(false)
                  setPinChanged(true)
                }}
                onCancel={() => setIsChangingPin(false)}
                onSessionExpired={returnToGate}
              />
            )}

            {pinChanged && <FeedbackMessage tone="info">{TEXT.parentZone.pinChangedMessage}</FeedbackMessage>}

            <FooterActions>
              <Button variant="muted" onClick={() => navigate('/child-home')}>
                {TEXT.parentZone.backButtonLabel}
              </Button>
              {!isChangingPin && (
                <Button
                  variant="muted"
                  onClick={() => {
                    setIsChangingPin(true)
                    setPinChanged(false)
                  }}
                >
                  {TEXT.parentZone.changePinButtonLabel}
                </Button>
              )}
              <Button variant="muted" onClick={handleLock} disabled={isLocking}>
                {TEXT.parentZone.lockButtonLabel}
              </Button>
              {lockError && <FeedbackMessage tone="error">{lockError}</FeedbackMessage>}
              <Button variant="muted" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? TEXT.parentZone.loggingOutLabel : TEXT.parentZone.logoutButtonLabel}
              </Button>
              {logoutError && <FeedbackMessage tone="error">{logoutError}</FeedbackMessage>}
            </FooterActions>
          </>
        )}
      </AuthCard>
    </PageShell>
  )
}

export default ParentZonePage
