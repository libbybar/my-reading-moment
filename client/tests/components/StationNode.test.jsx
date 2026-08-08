import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import StationNode from '../../src/components/ui/StationNode'
import { TEXT } from '../../src/constants/text'
import { theme } from '../../src/styles/theme'

function renderStationNode(props) {
  return render(
    <ThemeProvider theme={theme}>
      <StationNode stepNumber={1} {...props} />
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('StationNode', () => {
  it('renders an active station as a clickable button with no visible label, showing only its step number', () => {
    const onClick = vi.fn()
    renderStationNode({
      status: 'active',
      stepNumber: 1,
      accessibleLabel: TEXT.childHome.activeStationAccessibleLabel,
      onClick,
    })

    const accessibleName = `${TEXT.childHome.stepLabelPrefix} 1, ${TEXT.childHome.activeStationAccessibleLabel}`
    const button = screen.getByRole('button', { name: accessibleName })
    expect(button).toHaveTextContent('1')
    expect(screen.queryByText(TEXT.childHome.activeStationAccessibleLabel)).not.toBeInTheDocument()

    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a locked station with its future step number and no visible caption, and not as an accessible button', () => {
    renderStationNode({ status: 'locked', stepNumber: 2 })

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('exposes a composed accessible label for a locked station, combining step and locked status', () => {
    renderStationNode({ status: 'locked', stepNumber: 2 })

    expect(screen.getByRole('group', { name: 'שלב 2, נעול' })).toBeInTheDocument()
  })

  it('renders a completed station with its step number and no visible caption, and not as an accessible button', () => {
    renderStationNode({ status: 'completed', stepNumber: 1 })

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('exposes a composed accessible label for a completed station, combining step and completed status', () => {
    renderStationNode({ status: 'completed', stepNumber: 1 })

    expect(screen.getByRole('group', { name: 'שלב 1, הושלם' })).toBeInTheDocument()
  })

  it('does not confuse a completed station with a locked one', () => {
    renderStationNode({ status: 'completed', stepNumber: 1 })

    expect(screen.queryByRole('group', { name: 'שלב 1, נעול' })).not.toBeInTheDocument()
  })
})
