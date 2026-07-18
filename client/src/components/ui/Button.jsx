import { StyledButton } from '../../styles/components/ButtonStyle'

function Button({ children, onClick, disabled = false, type = 'button' }) {
  return (
    <StyledButton type={type} onClick={onClick} disabled={disabled}>
      {children}
    </StyledButton>
  )
}

export default Button
