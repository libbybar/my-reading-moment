import styled from 'styled-components'

export const StyledTextField = styled.input`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  background: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 16px;

  &:disabled {
    background: ${(props) => props.theme.colors.surfaceSoft};
    color: ${(props) => props.theme.colors.textMuted};
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 12px;
  }
`
