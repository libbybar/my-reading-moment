import { ToggleChipGroupWrapper, ToggleChip } from '../../styles/components/ToggleChipGroupStyle'

function ToggleChipGroup({ options, selectedValues, onToggle, disabled = false, ariaLabel }) {
  return (
    <ToggleChipGroupWrapper role="group" aria-label={ariaLabel}>
      {options.map(({ value, label, Icon }) => {
        const isSelected = selectedValues.includes(value)

        return (
          <ToggleChip
            key={value}
            type="button"
            $selected={isSelected}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onToggle(value)}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            {label}
          </ToggleChip>
        )
      })}
    </ToggleChipGroupWrapper>
  )
}

export default ToggleChipGroup
