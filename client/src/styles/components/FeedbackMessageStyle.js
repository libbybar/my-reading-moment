import styled from 'styled-components'

const toneColor = {
  success: (theme) => theme.colors.success,
  error: (theme) => theme.colors.error,
  info: (theme) => theme.colors.text,
}

export const StyledFeedbackMessage = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => toneColor[props.tone](props.theme)};
  margin: 0;
`
