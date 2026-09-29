import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { Rocket, Trophy } from 'lucide-react'
import ToggleChipGroup from '../../src/components/ui/ToggleChipGroup'
import { theme } from '../../src/styles/theme'

afterEach(() => {
  cleanup()
})

const OPTIONS = [
  { value: 'space', label: 'Space', Icon: Rocket },
  { value: 'sports', label: 'Sports', Icon: Trophy },
]

function renderGroup(props) {
  return render(
    <ThemeProvider theme={theme}>
      <ToggleChipGroup
        options={OPTIONS}
        selectedValues={[]}
        onToggle={() => {}}
        ariaLabel="Interests"
        {...props}
      />
    </ThemeProvider>,
  )
}

describe('ToggleChipGroup', () => {
  it('renders one button per option, none pressed when nothing is selected', () => {
    renderGroup()

    const spaceButton = screen.getByRole('button', { name: 'Space' })
    const sportsButton = screen.getByRole('button', { name: 'Sports' })

    expect(spaceButton).toHaveAttribute('aria-pressed', 'false')
    expect(sportsButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks a selected option as pressed', () => {
    renderGroup({ selectedValues: ['space'] })

    expect(screen.getByRole('button', { name: 'Space' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sports' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle with the clicked option\'s value', () => {
    const handleToggle = vi.fn()
    renderGroup({ onToggle: handleToggle })

    fireEvent.click(screen.getByRole('button', { name: 'Sports' }))

    expect(handleToggle).toHaveBeenCalledWith('sports')
  })

  it('disables every option when disabled is true', () => {
    renderGroup({ disabled: true })

    expect(screen.getByRole('button', { name: 'Space' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sports' })).toBeDisabled()
  })

  it('exposes the group with the supplied accessible name', () => {
    renderGroup({ ariaLabel: 'Pick your interests' })

    expect(screen.getByRole('group', { name: 'Pick your interests' })).toBeInTheDocument()
  })
})
