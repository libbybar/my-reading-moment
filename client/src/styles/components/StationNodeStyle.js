import styled from 'styled-components'

const StationCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.18);

  @media (max-width: 480px) {
    width: 48px;
    height: 48px;
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

export const CompletedStationCircle = styled(StationCircle)`
  background: ${(props) => props.theme.colors.success};
  color: ${(props) => props.theme.colors.surface};
`

// Stations must paint above the path line and row connectors.
export const ActiveStationButton = styled.button`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 64px;
  border: none;
  background: none;
  padding: 0;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.08) translateY(-2px);
  }

  &:active {
    transform: scale(1.02) translateY(1px);
  }

  @media (max-width: 480px) {
    width: 56px;
  }
`

export const LockedStationWrapper = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 64px;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.textMuted};

  @media (max-width: 480px) {
    width: 56px;
  }
`

export const CompletedStationWrapper = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 64px;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};

  @media (max-width: 480px) {
    width: 56px;
  }
`

export const StepNumber = styled.span`
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 24px;
  font-weight: 700;
`
