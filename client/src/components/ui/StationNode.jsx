import { TEXT } from '../../constants/text'
import {
  ActiveStationButton,
  ActiveStationCircle,
  LockedStationWrapper,
  LockedStationCircle,
  StepNumber,
} from '../../styles/components/StationNodeStyle'

function StationNode({ accessibleLabel, status, stepNumber, onClick }) {
  if (status === 'active') {
    // No visible label here — the page's own greeting heading already states
    // the action, so a second visible label under the circle was redundant.
    // The button still needs an accessible name, since its only remaining
    // content (the step number) is aria-hidden.
    const activeAriaLabel = `${TEXT.childHome.stepLabelPrefix} ${stepNumber}, ${accessibleLabel}`

    return (
      <ActiveStationButton type="button" onClick={onClick} aria-label={activeAriaLabel}>
        <ActiveStationCircle aria-hidden="true">
          <StepNumber>{stepNumber}</StepNumber>
        </ActiveStationCircle>
      </ActiveStationButton>
    )
  }

  // No visible label here either — the step number plus the muted/locked
  // styling already communicate the state; a "coming soon" caption added
  // nothing, since reaching it is just the natural next step after the
  // active one. The accessible name still states step + locked status.
  const lockedAriaLabel = `${TEXT.childHome.stepLabelPrefix} ${stepNumber}, ${TEXT.childHome.lockedStepStatusLabel}`

  return (
    <LockedStationWrapper role="group" aria-label={lockedAriaLabel}>
      <LockedStationCircle aria-hidden="true">
        <StepNumber>{stepNumber}</StepNumber>
      </LockedStationCircle>
    </LockedStationWrapper>
  )
}

export default StationNode
