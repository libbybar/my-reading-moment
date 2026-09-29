import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import ChildProgressChart from '../../src/pages/ChildProgressChart'
import { TEXT } from '../../src/constants/text'
import { theme } from '../../src/styles/theme'

const RESULTS = [
  { level: 1, sublevel: 1, result: 'success', completedAt: '2026-01-01T10:00:00.000Z' },
  { level: 1, sublevel: 2, result: 'failure', completedAt: '2026-01-02T10:00:00.000Z' },
  { level: 1, sublevel: 2, result: 'skipped', completedAt: '2026-01-03T10:00:00.000Z' },
]

function renderChart(results = RESULTS) {
  return render(
    <ThemeProvider theme={theme}>
      <ChildProgressChart results={results} />
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('ChildProgressChart', () => {
  it('renders an accessible chart with one hit target per result', () => {
    renderChart()

    expect(screen.getByRole('img', { name: TEXT.childProgress.chartAccessibleLabel })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(RESULTS.length)
  })

  it('gives each point an accessible label with date, level, and result', () => {
    renderChart()

    expect(
      screen.getByRole('button', { name: new RegExp(`1\\.1.*${TEXT.childProgress.chartResultSuccessLabel}`) }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(`1\\.2.*${TEXT.childProgress.chartResultFailureLabel}`) }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(`1\\.2.*${TEXT.childProgress.chartResultSkippedLabel}`) }),
    ).toBeInTheDocument()
  })

  it('shows a legend with all three result labels', () => {
    renderChart()

    const legend = screen.getByRole('list')

    expect(within(legend).getByText(TEXT.childProgress.chartResultSuccessLabel)).toBeInTheDocument()
    expect(within(legend).getByText(TEXT.childProgress.chartResultFailureLabel)).toBeInTheDocument()
    expect(within(legend).getByText(TEXT.childProgress.chartResultSkippedLabel)).toBeInTheDocument()
  })

  it('shows a tooltip with the point details on hover, and hides it on mouse leave', () => {
    renderChart()

    const successPoint = screen.getByRole('button', {
      name: new RegExp(TEXT.childProgress.chartResultSuccessLabel),
    })

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.mouseEnter(successPoint)
    expect(within(screen.getByRole('tooltip')).getByText('1.1')).toBeInTheDocument()

    fireEvent.mouseLeave(successPoint)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows the same details on keyboard focus as on hover', () => {
    renderChart()

    const failurePoint = screen.getByRole('button', {
      name: new RegExp(TEXT.childProgress.chartResultFailureLabel),
    })

    fireEvent.focus(failurePoint)
    const tooltip = screen.getByRole('tooltip')
    expect(within(tooltip).getByText('1.2')).toBeInTheDocument()
    expect(within(tooltip).getByText(TEXT.childProgress.chartResultFailureLabel, { exact: false })).toBeInTheDocument()

    fireEvent.blur(failurePoint)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('provides every value in a table, reachable without hovering', () => {
    renderChart()

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')

    // Header row + one row per result.
    expect(rows).toHaveLength(RESULTS.length + 1)
    expect(within(table).getAllByText(TEXT.childProgress.chartResultSuccessLabel)).toHaveLength(1)
    expect(within(table).getAllByText(TEXT.childProgress.chartResultFailureLabel)).toHaveLength(1)
    expect(within(table).getAllByText(TEXT.childProgress.chartResultSkippedLabel)).toHaveLength(1)
  })

  it('renders a single point without crashing when there is only one result', () => {
    renderChart([RESULTS[0]])

    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
