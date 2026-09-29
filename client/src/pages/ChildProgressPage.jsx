import { useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router'
import { TEXT } from '../constants/text'
import { fetchChildProgress, ChildProfileServiceError } from '../services/childProfileService'
import { isParentZoneLockedError } from '../services/parentZoneService'
import Button from '../components/ui/Button'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import ChildProgressChart from './ChildProgressChart'
import {
  ProgressCard,
  ProgressHeading,
  StatsRow,
  StatCard,
  StatLabel,
  StatValue,
} from '../styles/ChildProgressPageStyle'

function ChildProgressPage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [returnToParentZone, setReturnToParentZone] = useState(false)

  useEffect(() => {
    // StrictMode can resolve a stale fetch after cleanup.
    let ignore = false

    fetchChildProgress(childId)
      .then((data) => {
        if (ignore) {
          return
        }

        setProgress(data)
      })
      .catch((caughtError) => {
        if (ignore) {
          return
        }

        if (caughtError instanceof ChildProfileServiceError && caughtError.status === 401) {
          setNeedsLogin(true)
          return
        }

        // Ownership-scoped lookup: an unowned or stale childId is
        // indistinguishable from one that never existed (same 404 the
        // server already uses everywhere else) — treated as "go back",
        // not shown as a broken-page error. A locked parent zone goes
        // back the same way, where the gate asks for the PIN.
        if (
          (caughtError instanceof ChildProfileServiceError && caughtError.status === 404) ||
          isParentZoneLockedError(caughtError)
        ) {
          setReturnToParentZone(true)
          return
        }

        setError(TEXT.childProgress.error)
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [childId])

  if (needsLogin) {
    return <Navigate to="/login" replace />
  }

  if (returnToParentZone) {
    return <Navigate to="/parent-zone" replace />
  }

  if (loading) {
    return (
      <PageShell>
        <FeedbackMessage tone="info">{TEXT.childProgress.loading}</FeedbackMessage>
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

  return (
    <PageShell>
      <ProgressCard>
        <Button variant="muted" onClick={() => navigate('/parent-zone')}>
          {TEXT.childProgress.backButtonLabel}
        </Button>

        <ProgressHeading>{TEXT.childProgress.heading}</ProgressHeading>

        <StatsRow>
          <StatCard>
            <StatLabel>{TEXT.childProgress.currentLevelLabel}</StatLabel>
            <StatValue>
              {progress.currentLevel}.{progress.currentSublevel}
            </StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>{TEXT.childProgress.journeyProgressLabel}</StatLabel>
            <StatValue>{progress.journeyProgress}</StatValue>
          </StatCard>
        </StatsRow>

        {progress.results.length === 0 ? (
          <FeedbackMessage tone="info">{TEXT.childProgress.noHistoryMessage}</FeedbackMessage>
        ) : (
          <ChildProgressChart results={progress.results} />
        )}
      </ProgressCard>
    </PageShell>
  )
}

export default ChildProgressPage
