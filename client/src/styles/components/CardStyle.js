import styled from 'styled-components'

export const StyledCard = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.text};
  border-radius: 16px;
  padding: 32px;
`
