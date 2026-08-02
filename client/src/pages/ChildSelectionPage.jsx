import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TEXT } from '../constants/text'
import {
  fetchChildProfiles,
  createChildProfile,
  updateChildProfile,
  ChildProfileServiceError,
} from '../services/childProfileService'
import { getChildAvatar } from '../constants/childAvatars'
import { useActiveChild } from '../context/useActiveChild'
import AvatarButton from '../components/ui/AvatarButton'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import SelectField from '../components/ui/SelectField'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import Card from '../components/ui/Card'
import {
  ChildSelectionHeading,
  ProfileGrid,
  ProfileCard,
  ProfileForm,
  FormActions,
} from '../styles/ChildSelectionPageStyle'

function ChildProfileForm({ initialValues = {}, onSave, onCancel, isSaving, error }) {
  const [name, setName] = useState(initialValues.name ?? '')
  const [grammaticalGender, setGrammaticalGender] = useState(
    initialValues.grammaticalGender ?? 'female',
  )
  const [readingLevel, setReadingLevel] = useState(initialValues.readingLevel ?? 'beginner')
  const [interestsText, setInterestsText] = useState((initialValues.interests ?? []).join(', '))

  function handleSubmit(event) {
    event.preventDefault()

    const interests = interestsText
      .split(',')
      .map((interest) => interest.trim())
      .filter((interest) => interest.length > 0)

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
      <TextField
        value={interestsText}
        onChange={(event) => setInterestsText(event.target.value)}
        placeholder={TEXT.childSelection.interestsFieldPlaceholder}
        ariaLabel={TEXT.childSelection.interestsFieldPlaceholder}
        disabled={isSaving}
      />
      {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}
      <FormActions>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? TEXT.childSelection.savingLabel : TEXT.childSelection.saveButtonLabel}
        </Button>
        <Button type="button" onClick={onCancel} disabled={isSaving}>
          {TEXT.childSelection.cancelButtonLabel}
        </Button>
      </FormActions>
    </ProfileForm>
  )
}

function ChildSelectionPage() {
  const [childProfiles, setChildProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { selectActiveChild } = useActiveChild()
  const [editingChildId, setEditingChildId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  function handleSelectProfile(profileId) {
    selectActiveChild(profileId)
    navigate('/child-home')
  }

  useEffect(() => {
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

        setError(TEXT.childSelection.error)
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [navigate])

  function handleSaveNewChild(values) {
    setIsSaving(true)
    setSaveError(null)

    createChildProfile(values)
      .then((createdProfile) => {
        setChildProfiles((prev) => [...prev, createdProfile])
        setIsAdding(false)
      })
      .catch(() => {
        setSaveError(TEXT.childSelection.saveError)
      })
      .finally(() => {
        setIsSaving(false)
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
      .catch(() => {
        setSaveError(TEXT.childSelection.saveError)
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  return (
    <PageShell>
      <Card>
        <ChildSelectionHeading>{TEXT.childSelection.heading}</ChildSelectionHeading>

        {loading && <FeedbackMessage tone="info">{TEXT.childSelection.loading}</FeedbackMessage>}

        {!loading && error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

        {!loading && !error && childProfiles.length === 0 && !isAdding && (
          <FeedbackMessage tone="info">{TEXT.childSelection.emptyMessage}</FeedbackMessage>
        )}

        {!loading && !error && childProfiles.length > 0 && (
          <ProfileGrid>
            {childProfiles.map((profile) =>
              editingChildId === profile.id ? (
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
              ) : (
                <ProfileCard key={profile.id}>
                  <AvatarButton
                    avatar={getChildAvatar(profile)}
                    label={profile.name}
                    onClick={() => handleSelectProfile(profile.id)}
                  />
                  <Button
                    onClick={() => {
                      setEditingChildId(profile.id)
                      setSaveError(null)
                    }}
                  >
                    {TEXT.childSelection.editButtonLabel}
                  </Button>
                </ProfileCard>
              ),
            )}
          </ProfileGrid>
        )}

        {!loading && !error && !isAdding && (
          <Button
            onClick={() => {
              setIsAdding(true)
              setSaveError(null)
            }}
          >
            {TEXT.childSelection.addButtonLabel}
          </Button>
        )}

        {!loading && !error && isAdding && (
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
      </Card>
    </PageShell>
  )
}

export default ChildSelectionPage
