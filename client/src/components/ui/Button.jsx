import { StyledButton } from '../../styles/components/ButtonStyle'

function Button({ children, onClick, disabled = false, type = 'button', variant = 'primary' }) {
  return (
    <StyledButton type={type} onClick={onClick} disabled={disabled} $variant={variant}>
      {children}
    </StyledButton>
  )
}

export default Button
