import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import AvatarButton from '../src/components/ui/AvatarButton'
import { theme } from '../src/styles/theme'

function renderAvatarButton(props) {
  return render(
    <ThemeProvider theme={theme}>
      <AvatarButton avatar={<span data-testid="test-avatar">*</span>} label="שם לדוגמה" {...props} />
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AvatarButton', () => {
  it('renders as a button with the label as its accessible name', () => {
    renderAvatarButton()

    expect(screen.getByRole('button', { name: 'שם לדוגמה' })).toBeInTheDocument()
  })

  it('renders the given avatar node', () => {
    renderAvatarButton()

    expect(screen.getByTestId('test-avatar')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    renderAvatarButton({ onClick })

    fireEvent.click(screen.getByRole('button', { name: 'שם לדוגמה' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
