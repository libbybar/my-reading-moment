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
  margin-bottom: 24px;
`

export const StationRow = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  width: fit-content;
  margin-bottom: 20px;

  /* The path line, behind the stations — see StationNodeStyle.js, where the
     station wrappers get position: relative + a higher z-index so they
     paint on top of this instead of being covered by it. Dotted, not solid:
     a solid ruler-straight bar read as "calculator", not a playful trail —
     dots also forgive the per-station wobble below not lining up exactly. */
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

// Bridges the gap between one row and the next, on whichever edge the path
// actually continues from (see ChildHomePage.jsx for how $side is chosen).
// The left/right offset must match half of the station wrapper's width in
// StationNodeStyle.js, so it lines up under that row-edge station's center —
// the two files are coupled on purpose, not accidentally.
export const StationRowConnector = styled.div`
  position: absolute;
  bottom: -20px;
  ${(props) => (props.$side === 'left' ? 'left: 32px;' : 'right: 32px;')}
  width: 0;
  height: 20px;
  border-left: 4px dotted ${(props) => props.theme.colors.border};
  z-index: 0;

  @media (max-width: 480px) {
    ${(props) => (props.$side === 'left' ? 'left: 28px;' : 'right: 28px;')}
  }
`

// Small, per-station vertical offset so stations don't sit in a perfectly
// even grid — purely visual (transform doesn't affect layout or click
// targets), see ChildHomePage.jsx's getStationWobble for the pattern.
export const StationWobble = styled.div`
  transform: translateY(${(props) => props.$offset ?? 0}px);
`

export const SwitchChildAction = styled.div`
  display: flex;
  justify-content: center;
`
