import { useState } from 'react'
import { TEXT } from '../constants/text'
import {
  ChartWrapper,
  ChartSvg,
  AxisLabel,
  HitTarget,
  Tooltip,
  TooltipValue,
  Legend,
  LegendItem,
  LegendSwatch,
  TableToggle,
  TableToggleSummary,
  DataTable,
  STATUS_COLORS,
  LINE_COLOR,
} from '../styles/components/ChildProgressChartStyle'

// Reading level as one continuous position (1-16) — see readingLevelSpec.js
// for the level/sublevel grid this mirrors. Plotted as a single sequential
// trend line; each point's *result* (not its position) is a status, so it
// gets the status palette + a distinct shape, never color alone.
const WIDTH = 640
const HEIGHT = 260
const MARGIN = { top: 16, right: 16, bottom: 16, left: 40 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const MIN_POSITION = 1
const MAX_POSITION = 16

const Y_TICKS = [
  { position: 1, label: '1.1' },
  { position: 5, label: '2.1' },
  { position: 9, label: '3.1' },
  { position: 13, label: '4.1' },
  { position: 16, label: '4.4' },
]

function levelPosition(level, sublevel) {
  return (level - 1) * 4 + sublevel
}

function yForPosition(position) {
  const ratio = (position - MIN_POSITION) / (MAX_POSITION - MIN_POSITION)

  return MARGIN.top + (1 - ratio) * PLOT_HEIGHT
}

function xForIndex(index, count) {
  if (count <= 1) {
    return MARGIN.left + PLOT_WIDTH / 2
  }

  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

function resultLabel(result) {
  if (result === 'success') {
    return TEXT.childProgress.chartResultSuccessLabel
  }

  if (result === 'failure') {
    return TEXT.childProgress.chartResultFailureLabel
  }

  return TEXT.childProgress.chartResultSkippedLabel
}

// Marker shapes double-encode result (color + shape), so status is never
// color-alone — a real requirement for skipped/failure being distinguishable
// under color-vision deficiency, not just a nice-to-have.
function Marker({ result, x, y }) {
  const color = STATUS_COLORS[result]
  const ringProps = { fill: color, stroke: '#fff', strokeWidth: 2, strokeLinejoin: 'round' }

  if (result === 'success') {
    return <circle cx={x} cy={y} r={5} {...ringProps} />
  }

  if (result === 'failure') {
    return <polygon points={`${x},${y - 6} ${x + 6},${y + 5} ${x - 6},${y + 5}`} {...ringProps} />
  }

  return <polygon points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`} {...ringProps} />
}

function LegendMarker({ shape }) {
  if (shape === 'circle') {
    return <circle cx={6} cy={6} r={5} fill={STATUS_COLORS.success} />
  }

  if (shape === 'triangle') {
    return <polygon points="6,1 11,10 1,10" fill={STATUS_COLORS.failure} />
  }

  return <polygon points="6,1 11,6 6,11 1,6" fill={STATUS_COLORS.skipped} />
}

function ChildProgressChart({ results }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const points = results.map((entry) => ({
    ...entry,
    y: yForPosition(levelPosition(entry.level, entry.sublevel)),
  }))
  const withX = points.map((point, index) => ({ ...point, x: xForIndex(index, points.length) }))
  const linePoints = withX.map((point) => `${point.x},${point.y}`).join(' ')
  const hoveredPoint = hoveredIndex === null ? null : withX[hoveredIndex]

  return (
    <ChartWrapper>
      <ChartSvg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={TEXT.childProgress.chartAccessibleLabel}
      >
        {Y_TICKS.map((tick) => (
          <g key={tick.position}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yForPosition(tick.position)}
              y2={yForPosition(tick.position)}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <AxisLabel x={MARGIN.left - 8} y={yForPosition(tick.position) + 4} textAnchor="end">
              {tick.label}
            </AxisLabel>
          </g>
        ))}

        {withX.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {withX.map((point, index) => (
          <g key={index}>
            <Marker result={point.result} x={point.x} y={point.y} />
            <HitTarget
              cx={point.x}
              cy={point.y}
              r={12}
              tabIndex={0}
              role="button"
              aria-label={`${formatDate(point.completedAt)}, ${point.level}.${point.sublevel}, ${resultLabel(point.result)}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
            />
          </g>
        ))}
      </ChartSvg>

      {hoveredPoint && (
        <Tooltip
          role="tooltip"
          style={{
            left: `${(hoveredPoint.x / WIDTH) * 100}%`,
            top: `${(hoveredPoint.y / HEIGHT) * 100}%`,
          }}
        >
          {formatDate(hoveredPoint.completedAt)} —{' '}
          <TooltipValue>
            {hoveredPoint.level}.{hoveredPoint.sublevel}
          </TooltipValue>{' '}
          ({resultLabel(hoveredPoint.result)})
        </Tooltip>
      )}

      <Legend>
        <LegendItem>
          <LegendSwatch width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
            <LegendMarker shape="circle" />
          </LegendSwatch>
          {TEXT.childProgress.chartResultSuccessLabel}
        </LegendItem>
        <LegendItem>
          <LegendSwatch width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
            <LegendMarker shape="triangle" />
          </LegendSwatch>
          {TEXT.childProgress.chartResultFailureLabel}
        </LegendItem>
        <LegendItem>
          <LegendSwatch width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
            <LegendMarker shape="diamond" />
          </LegendSwatch>
          {TEXT.childProgress.chartResultSkippedLabel}
        </LegendItem>
      </Legend>

      <TableToggle>
        <TableToggleSummary>{TEXT.childProgress.showTableLabel}</TableToggleSummary>
        <DataTable>
          <thead>
            <tr>
              <th>{TEXT.childProgress.tableDateHeader}</th>
              <th>{TEXT.childProgress.tableLevelHeader}</th>
              <th>{TEXT.childProgress.tableResultHeader}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((entry, index) => (
              <tr key={index}>
                <td>{formatDate(entry.completedAt)}</td>
                <td>
                  {entry.level}.{entry.sublevel}
                </td>
                <td>{resultLabel(entry.result)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableToggle>
    </ChartWrapper>
  )
}

export default ChildProgressChart
