import { StyledTextField } from '../../styles/components/TextFieldStyle'

function TextField({ value, onChange, disabled = false, placeholder, name, id, ariaLabel }) {
  return (
    <StyledTextField
      type="text"
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      name={name}
      id={id}
      aria-label={ariaLabel}
    />
  )
}

export default TextField
