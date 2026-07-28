import styled from 'styled-components'

const StationCircle = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 480px) {
    width: 64px;
    height: 64px;
  }
`

export const ActiveStationCircle = styled(StationCircle)`
  background: ${(props) => props.theme.colors.accent};
  color: ${(props) => props.theme.colors.surface};
`

export const LockedStationCircle = styled(StationCircle)`
  background: ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.textMuted};
`

export const ActiveStationButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 96px;
  border: none;
  background: none;
  padding: 0;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;

  @media (max-width: 480px) {
    width: 84px;
  }
`

export const LockedStationWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 96px;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.textMuted};

  @media (max-width: 480px) {
    width: 84px;
  }
`

export const StepNumber = styled.span`
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 24px;
  font-weight: 700;
`
