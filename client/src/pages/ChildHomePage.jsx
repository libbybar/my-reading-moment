import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Users } from 'lucide-react'
import { TEXT } from '../constants/text'
import { resolveText } from '../constants/resolveText'
import {
  fetchChildProfiles,
  updateChildAvatar,
  ChildProfileServiceError,
} from '../services/childProfileService'
import { getChildAvatar } from '../constants/childAvatars'
import { AVATARS } from '../constants/avatars'
import { useActiveChild } from '../context/useActiveChild'
import AvatarButton from '../components/ui/AvatarButton'
import StationNode from '../components/ui/StationNode'
import Button from '../components/ui/Button'
import ParentZoneEntryButton from '../components/ui/ParentZoneEntryButton'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import PageShell from '../components/ui/PageShell'
import { ChildWorldShell, SkyOrb } from '../styles/ChildWorldStyle'
import {
  ChildHomeContent,
  AvatarPickerSection,
  AvatarPickerHeading,
  AvatarPickerGrid,
  ChildHomeHeader,
  ChildHomeGreeting,
  StationPath,
  StationRow,
  StationRowPath,
  StationRowConnector,
  StationWobble,
  SwitchChildIconButton,
} from '../styles/ChildHomePageStyle'

// Wider viewports get more stations per row instead of leaving the world
// mostly empty around a small, fixed-size cluster. Thresholds are chosen so
// the *default* test-environment width (jsdom: 1024px) still lands on 4 —
// existing station-count tests assume that baseline; the wider tiers get
// their own dedicated tests instead of changing every existing assertion.
const STATIONS_PER_ROW_BREAKPOINTS = [
  { minWidth: 1600, stationsPerRow: 8 },
  { minWidth: 1280, stationsPerRow: 6 },
  { minWidth: 0, stationsPerRow: 4 },
]

// Center-to-center pixel distance between two adjacent stations: circle
// width (StationNodeStyle.js) + this row's gap (ChildHomePageStyle.js) at
// each breakpoint. Used only to draw the connecting line between their
// centers — must stay in sync with those files, same "don't let this drift"
// contract StationRowConnector's own side offsets already carry.
const STATION_PITCH_BREAKPOINTS = [
  { minWidth: 1600, pitch: 116 }, // 72 circle + 44 gap
  { minWidth: 1280, pitch: 100 }, // 64 circle + 36 gap
  { minWidth: 480, pitch: 84 }, // 56 circle + 28 gap
  { minWidth: 0, pitch: 76 }, // 48 circle + 28 gap
]

function fromBreakpoints(breakpoints, width, key) {
  return breakpoints.find((breakpoint) => width >= breakpoint.minWidth)[key]
}

// Kept at exactly two rows' worth of lookahead regardless of how many
// stations fit per row, so a wider screen doesn't dump three rows of locked
// stations on a child who just unlocked their very first one.
function useResponsiveStationLayout() {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    stationsPerRow: fromBreakpoints(STATIONS_PER_ROW_BREAKPOINTS, width, 'stationsPerRow'),
    stationPitch: fromBreakpoints(STATION_PITCH_BREAKPOINTS, width, 'pitch'),
  }
}

// A smooth sine arc across each row (not a repeating +/-6px jitter) — every
// row bows up or down like a real winding path, and alternate rows bow in
// opposite directions so the path reads as one continuous snake instead of
// a stack of straight, barely-jiggling lines.
const STATION_WOBBLE_AMPLITUDE_PX = 26

function getStationWobble(indexInRow, rowLength, rowIndex) {
  if (rowLength <= 1) {
    return 0
  }

  const phase = (indexInRow / (rowLength - 1)) * Math.PI
  const direction = rowIndex % 2 === 0 ? 1 : -1

  return Math.round(Math.sin(phase) * STATION_WOBBLE_AMPLITUDE_PX * direction)
}

// The dotted line connecting station centers within a row, following the
// same sine wobble the stations themselves use — center-to-center, not a
// flat guideline the curve has since wandered away from.
//
// SVG coordinates are never auto-mirrored for RTL (only text is), but the
// page is RTL, so index 0 renders at the row's *right* edge, not its left —
// x is built right-to-left here to match, or the line would run backwards
// relative to the actual stations.
function buildRowPathPoints(rowLength, rowIndex, pitch) {
  return Array.from({ length: rowLength }, (_, indexInRow) => {
    const x = (rowLength - 1 - indexInRow) * pitch
    const y = STATION_WOBBLE_AMPLITUDE_PX + getStationWobble(indexInRow, rowLength, rowIndex)

    return `${x},${y}`
  }).join(' ')
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
  const [avatarSaveError, setAvatarSaveError] = useState(null)
  const [isChoosingAvatar, setIsChoosingAvatar] = useState(false)
  const { stationsPerRow, stationPitch } = useResponsiveStationLayout()

  useEffect(() => {
    if (!activeChildId) {
      return undefined
    }

    // StrictMode can resolve a stale fetch after cleanup.
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
          // Avoid racing the "profile not found" redirect below.
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

  function handleSelectAvatar(avatarId) {
    setAvatarSaveError(null)

    updateChildAvatar(activeChildId, avatarId)
      .then((updatedProfile) => {
        setChildProfiles((prev) =>
          prev.map((profile) => (profile.id === activeChildId ? updatedProfile : profile)),
        )
        setIsChoosingAvatar(false)
      })
      .catch(() => {
        setAvatarSaveError(TEXT.childSelection.saveError)
      })
  }

  const showAvatarPicker = !activeProfile.avatarId || isChoosingAvatar

  const journeyProgress = activeProfile.journeyProgress ?? 0
  const currentActiveStep = journeyProgress + 1
  const stationsLookahead = stationsPerRow * 2 - 1
  const stationsToRender = currentActiveStep + stationsLookahead

  const stations = Array.from({ length: stationsToRender }, (_, index) => {
    const stepNumber = index + 1
    let status = 'locked'

    if (stepNumber < currentActiveStep) {
      status = 'completed'
    } else if (stepNumber === currentActiveStep) {
      status = 'active'
    }

    return { stepNumber, status }
  })

  const stationRows = chunkIntoRows(stations, stationsPerRow).map((row, rowIndex) =>
    rowIndex % 2 === 1 ? [...row].reverse() : row,
  )

  return (
    <ChildWorldShell>
      <SkyOrb $top="6%" $left="8%" $size={90} $tone="accentLight" $duration="24s" />
      <SkyOrb $top="16%" $right="10%" $size={64} $tone="primaryLight" $duration="20s" $delay="-4s" />
      <SkyOrb $top="2%" $right="34%" $size={48} $tone="secondaryLight" $duration="28s" $delay="-9s" />

      <ChildHomeContent>
        <ParentZoneEntryButton
          ariaLabel={TEXT.parentZone.entryButtonAriaLabel}
          onClick={() => navigate('/parent-zone')}
        />

        <SwitchChildIconButton
          type="button"
          aria-label={TEXT.childHome.switchChildButtonLabel}
          onClick={() => navigate('/children')}
        >
          <Users size={18} aria-hidden="true" />
        </SwitchChildIconButton>

        {showAvatarPicker ? (
          <AvatarPickerSection>
            <AvatarPickerHeading>{TEXT.childHome.avatarPickerHeading}</AvatarPickerHeading>
            <AvatarPickerGrid>
              {AVATARS.map((avatarOption) => (
                <AvatarButton
                  key={avatarOption.id}
                  avatar={<img src={avatarOption.src} alt="" />}
                  label={TEXT.avatars[avatarOption.labelKey]}
                  onClick={() => handleSelectAvatar(avatarOption.id)}
                />
              ))}
            </AvatarPickerGrid>
            {avatarSaveError && <FeedbackMessage tone="error">{avatarSaveError}</FeedbackMessage>}
            {activeProfile.avatarId && (
              <Button
                variant="muted"
                onClick={() => {
                  setIsChoosingAvatar(false)
                  setAvatarSaveError(null)
                }}
              >
                {TEXT.childSelection.cancelButtonLabel}
              </Button>
            )}
          </AvatarPickerSection>
        ) : (
          <>
            <ChildHomeHeader>
              <AvatarButton
                avatar={getChildAvatar(activeProfile)}
                label={activeProfile.name}
                onClick={() => setIsChoosingAvatar(true)}
              />
              <ChildHomeGreeting>
                {resolveText('childHome.heading', {
                  grammaticalGender: activeProfile.grammaticalGender,
                })}
              </ChildHomeGreeting>
            </ChildHomeHeader>

            <StationPath>
              {stationRows.map((row, rowIndex) => (
                <StationRow key={rowIndex}>
                  {row.length > 1 && (
                    <StationRowPath
                      aria-hidden="true"
                      width={(row.length - 1) * stationPitch}
                      height={STATION_WOBBLE_AMPLITUDE_PX * 2}
                      viewBox={`0 0 ${(row.length - 1) * stationPitch} ${STATION_WOBBLE_AMPLITUDE_PX * 2}`}
                    >
                      <polyline
                        points={buildRowPathPoints(row.length, rowIndex, stationPitch)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray="2 10"
                        strokeLinecap="round"
                      />
                    </StationRowPath>
                  )}
                  {row.map((station, indexInRow) => {
                    const restingOffset = getStationWobble(indexInRow, row.length, rowIndex)

                    return (
                      <StationWobble
                        key={station.stepNumber}
                        initial={{ opacity: 0, scale: 0.4, y: restingOffset + 24 }}
                        animate={{ opacity: 1, scale: 1, y: restingOffset }}
                        transition={{
                          delay: (station.stepNumber - 1) * 0.05,
                          type: 'spring',
                          stiffness: 260,
                          damping: 18,
                        }}
                      >
                        <StationNode
                          status={station.status}
                          stepNumber={station.stepNumber}
                          accessibleLabel={
                            station.status === 'active'
                              ? TEXT.childHome.activeStationAccessibleLabel
                              : undefined
                          }
                          onClick={station.status === 'active' ? () => navigate('/') : undefined}
                        />
                      </StationWobble>
                    )
                  })}
                  {rowIndex < stationRows.length - 1 && (
                    <StationRowConnector $side={rowIndex % 2 === 0 ? 'left' : 'right'} />
                  )}
                </StationRow>
              ))}
            </StationPath>
          </>
        )}
      </ChildHomeContent>
    </ChildWorldShell>
  )
}

export default ChildHomePage
