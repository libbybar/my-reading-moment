import styled from 'styled-components'

// Status palette (fixed, never themed — see the dataviz skill's palette.md).
// Kept local to this one chart rather than in theme.js since nothing else
// in the app needs "good/warning/serious" as a concept yet.
export const STATUS_COLORS = {
  success: '#0ca30c', // good
  failure: '#ec835a', // serious
  skipped: '#fab219', // warning
}

// Sequential single hue for the trend line itself (the line's job is
// magnitude-over-time, not identity — see choosing-a-form.md).
export const LINE_COLOR = '#2a78d6'

export const ChartWrapper = styled.div`
  position: relative;
  margin-top: 8px;
`

export const ChartSvg = styled.svg`
  width: 100%;
  height: auto;
  overflow: visible;
`

export const AxisLabel = styled.text`
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 11px;
  fill: ${(props) => props.theme.colors.textMuted};
`

export const HitTarget = styled.circle`
  fill: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 2px;
  }
`

export const Tooltip = styled.div`
  position: absolute;
  transform: translate(-50%, -100%);
  background: ${(props) => props.theme.colors.text};
  color: ${(props) => props.theme.colors.surface};
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1;
`

export const TooltipValue = styled.strong`
  font-weight: 700;
`

export const Legend = styled.ul`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
`

export const LegendItem = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.textMuted};
  font-size: 13px;
`

export const LegendSwatch = styled.svg`
  flex-shrink: 0;
`

export const TableToggle = styled.details`
  margin-top: 16px;
`

export const TableToggleSummary = styled.summary`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primary};
  font-size: 14px;
  cursor: pointer;
  width: fit-content;
`

export const DataTable = styled.table`
  width: 100%;
  margin-top: 12px;
  border-collapse: collapse;
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 13px;

  th,
  td {
    text-align: right;
    padding: 6px 8px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border};
  }

  th {
    color: ${(props) => props.theme.colors.textMuted};
    font-weight: 600;
  }

  td {
    color: ${(props) => props.theme.colors.text};
  }
`
