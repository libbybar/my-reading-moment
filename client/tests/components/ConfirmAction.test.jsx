import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import ConfirmAction from '../../src/components/ui/ConfirmAction'
import { theme } from '../../src/styles/theme'

afterEach(() => {
  cleanup()
})

function renderConfirmAction(props) {
  return render(
    <ThemeProvider theme={theme}>
      <ConfirmAction
        message="Delete this?"
        confirmLabel="Yes, delete"
        confirmingLabel="Deleting..."
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
        {...props}
      />
    </ThemeProvider>,
  )
}

describe('ConfirmAction', () => {
  it('renders the supplied message and both action buttons', () => {
    renderConfirmAction()

    expect(screen.getByText('Delete this?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', () => {
    const handleConfirm = vi.fn()
    renderConfirmAction({ onConfirm: handleConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the cancel button is clicked', () => {
    const handleCancel = vi.fn()
    renderConfirmAction({ onCancel: handleCancel })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('swaps to the confirming label and disables both buttons while isConfirming is true', () => {
    renderConfirmAction({ isConfirming: true })

    expect(screen.queryByRole('button', { name: 'Yes, delete' })).not.toBeInTheDocument()
    const confirmingButton = screen.getByRole('button', { name: 'Deleting...' })
    expect(confirmingButton).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
