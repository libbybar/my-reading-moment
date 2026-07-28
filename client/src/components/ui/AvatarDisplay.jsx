import { AvatarDisplayWrapper, AvatarCircle, AvatarLabel } from '../../styles/components/AvatarButtonStyle'

function AvatarDisplay({ avatar, label }) {
  return (
    <AvatarDisplayWrapper>
      <AvatarCircle aria-hidden="true">{avatar}</AvatarCircle>
      <AvatarLabel>{label}</AvatarLabel>
    </AvatarDisplayWrapper>
  )
}

export default AvatarDisplay
