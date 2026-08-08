import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter } from 'react-router'
import RegisterPage from '../src/pages/RegisterPage'
import { TEXT } from '../src/constants/text'
import { theme } from '../src/styles/theme'
import { register, AuthServiceError } from '../src/services/authService'

vi.mock('../src/services/authService', () => ({
  register: vi.fn(),
  AuthServiceError: class AuthServiceError extends Error {
    constructor(message, { status, body } = {}) {
      super(message)
      this.name = 'AuthServiceError'
      this.status = status
      this.body = body
    }
  },
}))

function renderPage() {
  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/register']}>
          <RegisterPage />
        </MemoryRouter>
      </ThemeProvider>
    </StrictMode>,
  )
}

function fillAndSubmit(email, password) {
  fireEvent.change(screen.getByLabelText(TEXT.register.emailAriaLabel), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText(TEXT.register.passwordAriaLabel), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: TEXT.register.submitButtonLabel }))
}

beforeEach(() => {
  register.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RegisterPage', () => {
  it('calls register with the entered email and password on submit', () => {
    register.mockReturnValue(new Promise(() => {}))

    renderPage()
    fillAndSubmit('parent@example.com', 'correct-horse')

    expect(register).toHaveBeenCalledWith({
      email: 'parent@example.com',
      password: 'correct-horse',
    })
  })

  it('shows the invalid-input message for a 400 response', async () => {
    register.mockRejectedValue(
      new AuthServiceError('Request failed with status 400', { status: 400 }),
    )

    renderPage()
    fillAndSubmit('parent@example.com', 'correct-horse')

    expect(await screen.findByText(TEXT.register.invalidInputError)).toBeInTheDocument()
    expect(register).toHaveBeenCalledWith({
      email: 'parent@example.com',
      password: 'correct-horse',
    })
  })

  it('rejects invalid form input before calling register', async () => {
    renderPage()
    fillAndSubmit('not-an-email', 'short')

    expect(await screen.findByText(TEXT.register.invalidInputError)).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('shows the email-taken message for a 409 response', async () => {
    register.mockRejectedValue(
      new AuthServiceError('Request failed with status 409', { status: 409 }),
    )

    renderPage()
    fillAndSubmit('parent@example.com', 'correct-horse')

    expect(await screen.findByText(TEXT.register.emailTakenError)).toBeInTheDocument()
  })

  it('shows a generic message for any other failure', async () => {
    register.mockRejectedValue(new TypeError('Failed to fetch'))

    renderPage()
    fillAndSubmit('parent@example.com', 'correct-horse')

    expect(await screen.findByText(TEXT.register.genericError)).toBeInTheDocument()
  })

  it('re-enables the form after a failure', async () => {
    register.mockRejectedValue(
      new AuthServiceError('Request failed with status 409', { status: 409 }),
    )

    renderPage()
    fillAndSubmit('parent@example.com', 'correct-horse')

    await screen.findByText(TEXT.register.emailTakenError)

    expect(
      screen.getByRole('button', { name: TEXT.register.submitButtonLabel }),
    ).not.toBeDisabled()
  })

  it('links to /login', () => {
    renderPage()

    expect(screen.getByRole('link', { name: TEXT.register.loginLinkLabel })).toHaveAttribute(
      'href',
      '/login',
    )
  })
})
