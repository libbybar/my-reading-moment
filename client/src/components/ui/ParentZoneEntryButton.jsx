import { Settings } from 'lucide-react'
import { StyledParentZoneEntryButton } from '../../styles/components/ParentZoneEntryButtonStyle'

function ParentZoneEntryButton({ onClick, ariaLabel }) {
  return (
    <StyledParentZoneEntryButton type="button" aria-label={ariaLabel} onClick={onClick}>
      <Settings size={18} aria-hidden="true" />
    </StyledParentZoneEntryButton>
  )
}

export default ParentZoneEntryButton
