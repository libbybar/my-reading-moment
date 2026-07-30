import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import TextField from '../src/components/ui/TextField'
import { theme } from '../src/styles/theme'
import { resolveText } from '../src/constants/resolveText'

afterEach(() => {
  cleanup()
})

function renderTextField(props) {
  return render(
    <ThemeProvider theme={theme}>
      <TextField value="" onChange={() => {}} {...props} />
    </ThemeProvider>,
  )
}

describe('TextField', () => {
  it('renders the supplied value', () => {
    renderTextField({ value: 'hello', ariaLabel: 'Answer' })

    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('hello')
  })

  it('calls onChange when the value changes', () => {
    const handleChange = vi.fn()
    renderTextField({ onChange: handleChange, ariaLabel: 'Answer' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), {
      target: { value: 'new value' },
    })

    expect(handleChange).toHaveBeenCalled()
  })

  it('calls onKeyDown when a key is pressed', () => {
    const handleKeyDown = vi.fn()
    renderTextField({ onKeyDown: handleKeyDown, ariaLabel: 'Answer' })

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Answer' }), { key: 'Enter' })

    expect(handleKeyDown).toHaveBeenCalled()
  })

  it('respects the disabled prop', () => {
    renderTextField({ disabled: true, ariaLabel: 'Answer' })

    expect(screen.getByRole('textbox', { name: 'Answer' })).toBeDisabled()
  })

  it('renders the supplied placeholder', () => {
    renderTextField({ placeholder: 'Type here', ariaLabel: 'Answer' })

    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('forwards the accessible label via aria-label', () => {
    renderTextField({ ariaLabel: 'Your answer' })

    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeInTheDocument()
  })

  it('renders with a localized accessible label resolved via resolveText', () => {
    const label = resolveText('readingSession.answerInputAriaLabel')
    renderTextField({ ariaLabel: label })

    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument()
  })

  it('stays a controlled input when value starts undefined and later becomes a string', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <TextField value={undefined} onChange={() => {}} ariaLabel="Answer" />
      </ThemeProvider>,
    )

    rerender(
      <ThemeProvider theme={theme}>
        <TextField value="hello" onChange={() => {}} ariaLabel="Answer" />
      </ThemeProvider>,
    )

    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('hello')
    expect(consoleError).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
