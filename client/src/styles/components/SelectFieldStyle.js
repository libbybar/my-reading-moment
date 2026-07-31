import styled from 'styled-components'

export const StyledSelectField = styled.select`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  background: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 16px;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.primary};
  }

  &:disabled {
    background: ${(props) => props.theme.colors.surfaceSoft};
    color: ${(props) => props.theme.colors.textMuted};
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 12px;
  }
`
