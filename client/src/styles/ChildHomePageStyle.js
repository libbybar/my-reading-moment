import styled from 'styled-components'

// No Card here on purpose — the path sits directly on the page's own cream
// background, with room to spread out, instead of being boxed into a small
// white window. Width is generous but still bounded, so it doesn't sprawl
// edge-to-edge on very wide monitors.
export const ChildHomeContent = styled.div`
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;
`

export const ChildHomeHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
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
  margin-bottom: 32px;
`

export const StationRow = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 28px;
  width: fit-content;
  margin-bottom: 36px;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 0;
    border-top: 4px dotted ${(props) => props.theme.colors.border};
    transform: translateY(-50%);
    z-index: 0;
  }
`

// Height/bottom must match StationRow's margin-bottom (the gap it bridges).
// Left/right offsets must match half the station wrapper width.
export const StationRowConnector = styled.div`
  position: absolute;
  bottom: -36px;
  ${(props) => (props.$side === 'left' ? 'left: 32px;' : 'right: 32px;')}
  width: 0;
  height: 36px;
  border-left: 4px dotted ${(props) => props.theme.colors.border};
  z-index: 0;

  @media (max-width: 480px) {
    ${(props) => (props.$side === 'left' ? 'left: 28px;' : 'right: 28px;')}
  }
`

export const StationWobble = styled.div`
  transform: translateY(${(props) => props.$offset ?? 0}px);
`

export const SwitchChildAction = styled.div`
  display: flex;
  justify-content: center;
`
