import styled from 'styled-components'

export const ChildHomeHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
`

export const ChildHomeGreeting = styled.h1`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primaryDark};
  font-size: 20px;
  font-weight: normal;
  margin: 0;
  text-align: center;
`

export const StationPath = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
`

export const SwitchChildAction = styled.div`
  display: flex;
  justify-content: center;
`
