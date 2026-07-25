import styled from 'styled-components'

export const StyledPageShell = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.colors.background};
  font-family: ${(props) => props.theme.fonts.main};
  padding: 24px 16px;

  @media (max-width: 480px) {
    padding: 16px 12px;
  }

  @media (max-width: 360px) {
    padding: 12px 8px;
  }
`
