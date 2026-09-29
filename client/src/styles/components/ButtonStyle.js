import styled, { css } from 'styled-components'

// primary = the one loud, constructive action on a screen (save, add, submit).
// danger = destructive (delete) — must never share a look with anything else.
// muted = everything routine (edit, cancel, back, logout) — present, not loud.
const VARIANT_STYLES = {
  primary: css`
    background: ${(props) => props.theme.colors.primary};
    color: ${(props) => props.theme.colors.surface};
    border: none;
    box-shadow: 0 3px 0 ${(props) => props.theme.colors.primaryDark};

    &:active:not(:disabled) {
      box-shadow: 0 1px 0 ${(props) => props.theme.colors.primaryDark};
    }
  `,
  danger: css`
    background: ${(props) => props.theme.colors.error};
    color: ${(props) => props.theme.colors.surface};
    border: none;
    box-shadow: 0 3px 0 ${(props) => props.theme.colors.errorDark};

    &:active:not(:disabled) {
      box-shadow: 0 1px 0 ${(props) => props.theme.colors.errorDark};
    }
  `,
  muted: css`
    background: ${(props) => props.theme.colors.surface};
    color: ${(props) => props.theme.colors.text};
    border: 1.5px solid ${(props) => props.theme.colors.border};
    box-shadow: none;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.colors.surfaceSoft};
      border-color: ${(props) => props.theme.colors.textMuted};
    }
  `,
}

export const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: ${(props) => props.theme.fonts.main};
  border-radius: 14px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease,
    border-color 0.15s ease;

  ${(props) => VARIANT_STYLES[props.$variant] ?? VARIANT_STYLES.primary}

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(2px);
  }

  &:disabled {
    background: ${(props) => props.theme.colors.textMuted};
    color: ${(props) => props.theme.colors.surface};
    border: none;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 480px) {
    padding: 12px 18px;
  }
`
