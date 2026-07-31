import styled from 'styled-components'

export const StyledButton = styled.button`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.surface};
  background: ${(props) => props.theme.colors.primary};
  border: none;
  border-radius: 14px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 3px 0 ${(props) => props.theme.colors.primaryDark};
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: 0 1px 0 ${(props) => props.theme.colors.primaryDark};
  }

  &:disabled {
    background: ${(props) => props.theme.colors.textMuted};
    box-shadow: none;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 12px 18px;
  }
`
