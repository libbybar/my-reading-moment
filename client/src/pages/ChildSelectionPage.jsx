import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TEXT } from '../constants/text'
import { fetchChildProfiles } from '../services/childProfileService'
import { getChildAvatar } from '../constants/childAvatars'
import { useActiveChild } from '../context/useActiveChild'
import AvatarButton from '../components/ui/AvatarButton'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import Card from '../components/ui/Card'
import { ChildSelectionHeading, ProfileGrid } from '../styles/ChildSelectionPageStyle'

function ChildSelectionPage() {
  const [childProfiles, setChildProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { selectActiveChild } = useActiveChild()

  function handleSelectProfile(profileId) {
    selectActiveChild(profileId)
    navigate('/child-home')
  }

  useEffect(() => {
    // React's StrictMode (enabled in main.jsx) intentionally mounts every
    // component twice in development, firing this effect twice back-to-back.
    // `ignore` is the standard pattern for a fetch-in-effect.
    let ignore = false

    fetchChildProfiles()
      .then((data) => {
        if (ignore) {
          return
        }

        setChildProfiles(data.childProfiles)
      })
      .catch(() => {
        if (!ignore) {
          setError(TEXT.childSelection.error)
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <PageShell>
      <Card>
        <ChildSelectionHeading>{TEXT.childSelection.heading}</ChildSelectionHeading>

        {loading && <FeedbackMessage tone="info">{TEXT.childSelection.loading}</FeedbackMessage>}

        {!loading && error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}

        {!loading && !error && childProfiles.length === 0 && (
          <FeedbackMessage tone="info">{TEXT.childSelection.emptyMessage}</FeedbackMessage>
        )}

        {!loading && !error && childProfiles.length > 0 && (
          <ProfileGrid>
            {childProfiles.map((profile) => (
              <AvatarButton
                key={profile.id}
                avatar={getChildAvatar(profile)}
                label={profile.name}
                onClick={() => handleSelectProfile(profile.id)}
              />
            ))}
          </ProfileGrid>
        )}
      </Card>
    </PageShell>
  )
}

export default ChildSelectionPage
