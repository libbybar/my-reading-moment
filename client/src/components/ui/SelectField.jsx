import { StyledSelect } from '../../styles/components/SelectFieldStyle'

function SelectField({ value, onChange, options }) {
  return (
    <StyledSelect value={value} onChange={onChange}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </StyledSelect>
  )
}

export default SelectField
