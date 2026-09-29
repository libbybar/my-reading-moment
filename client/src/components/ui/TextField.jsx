import { StyledTextField } from '../../styles/components/TextFieldStyle'

function TextField({
  value,
  onChange,
  onKeyDown,
  disabled = false,
  placeholder,
  name,
  id,
  ariaLabel,
  type = 'text',
  inputMode,
  maxLength,
  autoComplete,
}) {
  return (
    <StyledTextField
      type={type}
      value={value ?? ''}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      name={name}
      id={id}
      aria-label={ariaLabel}
      inputMode={inputMode}
      maxLength={maxLength}
      autoComplete={autoComplete}
    />
  )
}

export default TextField
