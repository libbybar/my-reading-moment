import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import AvatarDisplay from '../src/components/ui/AvatarDisplay'
import { theme } from '../src/styles/theme'

function renderAvatarDisplay(props) {
  return render(
    <ThemeProvider theme={theme}>
      <AvatarDisplay avatar={<span data-testid="test-avatar">*</span>} label="שם לדוגמה" {...props} />
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('AvatarDisplay', () => {
  it('renders the label text', () => {
    renderAvatarDisplay()

    expect(screen.getByText('שם לדוגמה')).toBeInTheDocument()
  })

  it('renders the given avatar node', () => {
    renderAvatarDisplay()

    expect(screen.getByTestId('test-avatar')).toBeInTheDocument()
  })

  it('is not exposed as a button, since it is a passive display, not a clickable control', () => {
    renderAvatarDisplay()

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
