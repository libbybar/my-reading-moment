import styled from 'styled-components'

export const StyledPageShell = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.colors.background};
  font-family: ${(props) => props.theme.fonts.main};
`
