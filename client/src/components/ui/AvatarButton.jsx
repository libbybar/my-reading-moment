import { StyledAvatarButton, AvatarCircle, AvatarLabel } from '../../styles/components/AvatarButtonStyle'

function AvatarButton({ avatar, label, onClick }) {
  return (
    <StyledAvatarButton type="button" onClick={onClick}>
      <AvatarCircle aria-hidden="true">{avatar}</AvatarCircle>
      <AvatarLabel>{label}</AvatarLabel>
    </StyledAvatarButton>
  )
}

export default AvatarButton
