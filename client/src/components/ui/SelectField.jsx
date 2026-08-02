import { StyledSelectField } from '../../styles/components/SelectFieldStyle'

function SelectField({ value, onChange, options, disabled = false, ariaLabel, name, id }) {
  return (
    <StyledSelectField
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      name={name}
      id={id}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </StyledSelectField>
  )
}

export default SelectField
