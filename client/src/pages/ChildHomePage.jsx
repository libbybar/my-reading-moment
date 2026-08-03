import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { TEXT } from '../constants/text'
import { resolveText } from '../constants/resolveText'
import { fetchChildProfiles, ChildProfileServiceError } from '../services/childProfileService'
import { getChildAvatar } from '../constants/childAvatars'
import { useActiveChild } from '../context/useActiveChild'
import AvatarDisplay from '../components/ui/AvatarDisplay'
import StationNode from '../components/ui/StationNode'
import Button from '../components/ui/Button'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import {
  ChildHomeContent,
  ChildHomeHeader,
  ChildHomeGreeting,
  StationPath,
  StationRow,
  StationRowConnector,
  StationWobble,
  SwitchChildAction,
} from '../styles/ChildHomePageStyle'

const TOTAL_STATIONS = 12

// Wider now that the path isn't boxed into a 480px card — see
// ChildHomeContent in ChildHomePageStyle.js for the page's own width.
const STATIONS_PER_ROW = 4

const STATION_WOBBLE_PATTERN_PX = [0, -6, 6]

function getStationWobble(stepNumber) {
  return STATION_WOBBLE_PATTERN_PX[(stepNumber - 1) % STATION_WOBBLE_PATTERN_PX.length]
}

function chunkIntoRows(items, itemsPerRow) {
  const rows = []

  for (let index = 0; index < items.length; index += itemsPerRow) {
    rows.push(items.slice(index, index + itemsPerRow))
  }

  return rows
}

function ChildHomePage() {
  const { activeChildId } = useActiveChild()
  const navigate = useNavigate()
  const [childProfiles, setChildProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => {
    if (!activeChildId) {
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
          // Set state and let the declarative <Navigate> below handle it,
          // same as every other redirect in this component — an imperative
          // navigate() call here would race the "profile not found" fallback
          // further down, which also fires once childProfiles resolves empty.
          setNeedsLogin(true)
          return
        }

        setError(TEXT.childHome.error)
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

  if (needsLogin) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <PageShell>
        <FeedbackMessage tone="info">{TEXT.childHome.loading}</FeedbackMessage>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <FeedbackMessage tone="error">{error}</FeedbackMessage>
      </PageShell>
    )
  }

  const activeProfile = childProfiles.find((profile) => profile.id === activeChildId)

  if (!activeProfile) {
    return <Navigate to="/children" replace />
  }

  const completedStepCount = activeProfile.completedStepCount ?? 0
  const currentActiveStep = completedStepCount + 1

  const stations = Array.from({ length: TOTAL_STATIONS }, (_, index) => {
    const stepNumber = index + 1
    let status = 'locked'

    if (stepNumber < currentActiveStep) {
      status = 'completed'
    } else if (stepNumber === currentActiveStep) {
      status = 'active'
    }

    return { stepNumber, status }
  })

  const stationRows = chunkIntoRows(stations, STATIONS_PER_ROW).map((row, rowIndex) =>
    rowIndex % 2 === 1 ? [...row].reverse() : row,
  )

  return (
    <PageShell>
      <ChildHomeContent>
        <ChildHomeHeader>
          <AvatarDisplay avatar={getChildAvatar(activeProfile)} label={activeProfile.name} />
          <ChildHomeGreeting>
            {resolveText('childHome.heading', { grammaticalGender: activeProfile.grammaticalGender })}
          </ChildHomeGreeting>
        </ChildHomeHeader>

        <StationPath>
          {stationRows.map((row, rowIndex) => (
            <StationRow key={rowIndex}>
              {row.map((station) => (
                <StationWobble key={station.stepNumber} $offset={getStationWobble(station.stepNumber)}>
                  <StationNode
                    status={station.status}
                    stepNumber={station.stepNumber}
                    accessibleLabel={
                      station.status === 'active' ? TEXT.childHome.activeStationAccessibleLabel : undefined
                    }
                    onClick={station.status === 'active' ? () => navigate('/') : undefined}
                  />
                </StationWobble>
              ))}
              {rowIndex < stationRows.length - 1 && (
                <StationRowConnector $side={rowIndex % 2 === 0 ? 'left' : 'right'} />
              )}
            </StationRow>
          ))}
        </StationPath>

        <SwitchChildAction>
          <Button onClick={() => navigate('/children')}>
            {TEXT.childHome.switchChildButtonLabel}
          </Button>
        </SwitchChildAction>
      </ChildHomeContent>
    </PageShell>
  )
}

export default ChildHomePage
