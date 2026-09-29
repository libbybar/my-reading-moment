import styled from 'styled-components'

export const ToggleChipGroupWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const ToggleChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 14px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1.5px solid
    ${(props) => (props.$selected ? props.theme.colors.primary : props.theme.colors.border)};
  background: ${(props) =>
    props.$selected ? props.theme.colors.primaryLight : props.theme.colors.surface};
  color: ${(props) => (props.$selected ? props.theme.colors.primaryDark : props.theme.colors.text)};
  font-weight: ${(props) => (props.$selected ? 600 : 400)};
  box-shadow: ${(props) => (props.$selected ? `0 2px 0 ${props.theme.colors.primary}` : 'none')};
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease,
    background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.colors.primary};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }
`
