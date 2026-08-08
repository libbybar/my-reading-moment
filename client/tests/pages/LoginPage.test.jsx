import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter } from 'react-router'
import LoginPage from '../../src/pages/LoginPage'
import { TEXT } from '../../src/constants/text'
import { theme } from '../../src/styles/theme'
import { login } from '../../src/services/authService'

vi.mock('../../src/services/authService', () => ({
  login: vi.fn(),
}))

function renderPage() {
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    </StrictMode>,
  )
}

function fillAndSubmit(email, password) {
  fireEvent.change(screen.getByLabelText(TEXT.login.emailAriaLabel), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText(TEXT.login.passwordAriaLabel), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: TEXT.login.submitButtonLabel }))
}

beforeEach(() => {
  login.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('calls login with the entered email and password on submit', async () => {
    login.mockReturnValue(new Promise(() => {}))

    renderPage()
    fillAndSubmit('parent@example.com', 'correct-horse')

    expect(login).toHaveBeenCalledWith({ email: 'parent@example.com', password: 'correct-horse' })
  })

  it('disables the submit button and shows the submitting label while the request is in flight', async () => {
    login.mockReturnValue(new Promise(() => {}))

    renderPage()
    fillAndSubmit('parent@example.com', 'correct-horse')

    const submitButton = await screen.findByRole('button', { name: TEXT.login.submittingLabel })
    expect(submitButton).toBeDisabled()
  })

  it('shows the localized error message when login rejects, and re-enables the form', async () => {
    login.mockRejectedValue(new Error('Request failed with status 401'))

    renderPage()
    fillAndSubmit('parent@example.com', 'wrong-password')

    expect(await screen.findByText(TEXT.login.error)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXT.login.submitButtonLabel }),
    ).not.toBeDisabled()
  })

  it('does not show the error message before any submission', () => {
    renderPage()

    expect(screen.queryByText(TEXT.login.error)).not.toBeInTheDocument()
  })
})
