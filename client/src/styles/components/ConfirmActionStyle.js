import styled from 'styled-components'

export const ConfirmActionWrapper = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: ${(props) => props.theme.colors.accentLight};
  border: 1px solid ${(props) => props.theme.colors.accent};
  border-radius: 12px;
  padding: 12px;
`

export const ConfirmActionIcon = styled.span`
  display: flex;
  flex-shrink: 0;
  color: ${(props) => props.theme.colors.accent};
`

export const ConfirmActionMessage = styled.p`
  flex: 1 1 auto;
  min-width: 160px;
  margin: 0;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  font-size: 15px;
`

export const ConfirmActionButtons = styled.div`
  display: flex;
  gap: 8px;
`
