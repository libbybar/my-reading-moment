import styled, { keyframes } from 'styled-components'

const drift = keyframes`
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(24px, -10px); }
`

export const ChildWorldShell = styled.div`
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px 48px;
  background: linear-gradient(180deg, transparent 65%, ${(props) => props.theme.colors.secondaryLight} 100%),
    linear-gradient(
      180deg,
      ${(props) => props.theme.colors.secondaryLight} 0%,
      ${(props) => props.theme.colors.background} 45%,
      ${(props) => props.theme.colors.background} 100%
    );

  @media (max-width: 480px) {
    padding: 24px 12px 40px;
  }
`

export const SkyOrb = styled.div`
  position: absolute;
  top: ${(props) => props.$top};
  left: ${(props) => props.$left};
  right: ${(props) => props.$right};
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  background: ${(props) => props.theme.colors[props.$tone]};
  filter: blur(1px);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
  animation: ${drift} ${(props) => props.$duration ?? '20s'} ease-in-out infinite;
  animation-delay: ${(props) => props.$delay ?? '0s'};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`
