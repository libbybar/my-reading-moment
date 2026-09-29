import styled from 'styled-components'

// Assumes a positioned ancestor (e.g. Card, ChildHomeContent) to anchor to.
export const StyledParentZoneEntryButton = styled.button`
  position: absolute;
  top: 0;
  inset-inline-end: 0;
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
