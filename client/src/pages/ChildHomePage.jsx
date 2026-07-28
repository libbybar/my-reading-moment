import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { TEXT } from '../constants/text'
import { resolveText } from '../constants/resolveText'
import { fetchChildProfiles } from '../services/childProfileService'
import { getChildAvatar } from '../constants/childAvatars'
import { useActiveChild } from '../context/useActiveChild'
import AvatarDisplay from '../components/ui/AvatarDisplay'
import StationNode from '../components/ui/StationNode'
import Button from '../components/ui/Button'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import Card from '../components/ui/Card'
import { ChildHomeHeader, ChildHomeGreeting, StationPath, SwitchChildAction } from '../styles/ChildHomePageStyle'

const LOCKED_STATIONS = [
  { id: 'locked-station-1', stepNumber: 2 },
  { id: 'locked-station-2', stepNumber: 3 },
]

function ChildHomePage() {
  const { activeChildId } = useActiveChild()
  const navigate = useNavigate()
  const [childProfiles, setChildProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeChildId) {
      return undefined
    }

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
          setError(TEXT.childHome.error)
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
  }, [activeChildId])

  if (!activeChildId) {
    return <Navigate to="/children" replace />
  }

  if (loading) {
    return (
      <PageShell>
        <Card>
          <FeedbackMessage tone="info">{TEXT.childHome.loading}</FeedbackMessage>
        </Card>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <Card>
          <FeedbackMessage tone="error">{error}</FeedbackMessage>
        </Card>
      </PageShell>
    )
  }

  const activeProfile = childProfiles.find((profile) => profile.id === activeChildId)

  if (!activeProfile) {
    return <Navigate to="/children" replace />
  }

  return (
    <PageShell>
      <Card>
        <ChildHomeHeader>
          <AvatarDisplay avatar={getChildAvatar(activeProfile)} label={activeProfile.name} />
          <ChildHomeGreeting>
            {resolveText('childHome.heading', { grammaticalGender: activeProfile.grammaticalGender })}
          </ChildHomeGreeting>
        </ChildHomeHeader>

        <StationPath>
          <StationNode
            accessibleLabel={TEXT.childHome.activeStationAccessibleLabel}
            status="active"
            stepNumber={1}
            onClick={() => navigate('/')}
          />
          {LOCKED_STATIONS.map((station) => (
            <StationNode key={station.id} status="locked" stepNumber={station.stepNumber} />
          ))}
        </StationPath>

        <SwitchChildAction>
          <Button onClick={() => navigate('/children')}>
            {TEXT.childHome.switchChildButtonLabel}
          </Button>
        </SwitchChildAction>
      </Card>
    </PageShell>
  )
}

export default ChildHomePage
