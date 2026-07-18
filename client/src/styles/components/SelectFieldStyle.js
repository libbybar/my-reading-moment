import styled from 'styled-components'

export const StyledSelect = styled.select`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  background: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 16px;
`
