import { TEXT } from '../../constants/text'
import {
  ActiveStationButton,
  ActiveStationCircle,
  LockedStationWrapper,
  LockedStationCircle,
  CompletedStationWrapper,
  CompletedStationCircle,
  StepNumber,
} from '../../styles/components/StationNodeStyle'

function StationNode({ accessibleLabel, status, stepNumber, onClick }) {
  if (status === 'active') {
    const activeAriaLabel = `${TEXT.childHome.stepLabelPrefix} ${stepNumber}, ${accessibleLabel}`

    return (
      <ActiveStationButton type="button" onClick={onClick} aria-label={activeAriaLabel}>
        <ActiveStationCircle aria-hidden="true">
          <StepNumber>{stepNumber}</StepNumber>
        </ActiveStationCircle>
      </ActiveStationButton>
    )
  }

  if (status === 'completed') {
    const completedAriaLabel = `${TEXT.childHome.stepLabelPrefix} ${stepNumber}, ${TEXT.childHome.completedStepStatusLabel}`

    return (
      <CompletedStationWrapper role="group" aria-label={completedAriaLabel}>
        <CompletedStationCircle aria-hidden="true">
          <StepNumber>{stepNumber}</StepNumber>
        </CompletedStationCircle>
      </CompletedStationWrapper>
    )
  }

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
