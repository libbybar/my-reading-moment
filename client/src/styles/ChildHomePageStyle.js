import styled from 'styled-components'
import { motion } from 'motion/react'

export const AvatarPickerSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
`

export const AvatarPickerHeading = styled.h1`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primaryDark};
  font-size: 22px;
  font-weight: normal;
  margin: 0;
  text-align: center;
`

export const AvatarPickerGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
`

// position: relative (+ z-index above the SkyOrbs) anchors the muted
// parent-zone entry button below. max-width steps match ChildHomePage.jsx's
// stationsPerRow breakpoints (1280/1600) — a wider column is what actually
// lets more stations fit per row instead of just spreading out.
export const ChildHomeContent = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (min-width: 1280px) {
    max-width: 880px;
  }

  @media (min-width: 1600px) {
    max-width: 1120px;
  }
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
  /* Tall enough to clear the +/-26px sine wobble (ChildHomePage.jsx) without
     adjacent rows visually colliding at their curve peaks. */
  margin-bottom: 64px;

  @media (min-width: 1280px) {
    gap: 36px;
  }

  @media (min-width: 1600px) {
    gap: 44px;
  }
`

// Spans exactly the center-to-center distance from the row's first to last
// station (width/height/viewBox set in ChildHomePage.jsx to match) — centered
// on the row itself, so it lines up regardless of the row's own circle size.
export const StationRowPath = styled.svg`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: ${(props) => props.theme.colors.border};
  z-index: 0;
  pointer-events: none;
`

// Side offset must track half of the station wrapper's own width
// (StationNodeStyle.js) at every breakpoint, or the connector drifts off
// the station's actual center.
export const StationRowConnector = styled.div`
  position: absolute;
  bottom: -64px;
  ${(props) => (props.$side === 'left' ? 'left: 32px;' : 'right: 32px;')}
  width: 0;
  height: 64px;
  border-left: 4px dotted ${(props) => props.theme.colors.border};
  z-index: 0;

  @media (max-width: 480px) {
    ${(props) => (props.$side === 'left' ? 'left: 28px;' : 'right: 28px;')}
  }

  @media (min-width: 1280px) {
    ${(props) => (props.$side === 'left' ? 'left: 36px;' : 'right: 36px;')}
  }

  @media (min-width: 1600px) {
    ${(props) => (props.$side === 'left' ? 'left: 40px;' : 'right: 40px;')}
  }
`

// The resting wobble offset now lives in the `animate` prop (a y value)
// passed from ChildHomePage.jsx, not a static CSS transform here — motion
// writes transform via inline style, which would otherwise silently fight
// with (and win over) a CSS transform declared in this styled-component.
export const StationWobble = styled(motion.div)``

export const SwitchChildIconButton = styled.button`
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  display: flex;
  background: none;
  border: none;
  border-radius: 8px;
  padding: 8px;
  line-height: 1;
  color: ${(props) => props.theme.colors.textMuted};
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.15s ease, background 0.15s ease;

  &:hover {
    opacity: 0.85;
    background: ${(props) => props.theme.colors.surfaceSoft};
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 2px;
    opacity: 0.85;
  }
`
