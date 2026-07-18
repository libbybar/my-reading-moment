import styled from 'styled-components'

export const StyledButton = styled.button`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.surface};
  background: ${(props) => props.theme.colors.primary};
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;

  &:disabled {
    background: ${(props) => props.theme.colors.textMuted};
    cursor: not-allowed;
  }
`
