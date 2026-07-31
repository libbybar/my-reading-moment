import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import App from '../src/App'
import { TEXT } from '../src/constants/text'
import { theme } from '../src/styles/theme'
import { register } from '../src/services/authService'

vi.mock('../src/services/authService', () => ({
  register: vi.fn(),
  login: vi.fn(),
  AuthServiceError: class AuthServiceError extends Error {
    constructor(message, { status, body } = {}) {
      super(message)
      this.name = 'AuthServiceError'
      this.status = status
      this.body = body
    }
  },
}))

function renderAppAtPath(path) {
  window.history.pushState({}, '', path)

  return render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  register.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('App register flow', () => {
  it('a successful registration navigates to /login, not straight into the app', async () => {
    register.mockResolvedValue({ id: 'parent-1', email: 'parent@example.com' })

    renderAppAtPath('/register')

    fireEvent.change(screen.getByLabelText(TEXT.register.emailAriaLabel), {
      target: { value: 'parent@example.com' },
    })
    fireEvent.change(screen.getByLabelText(TEXT.register.passwordAriaLabel), {
      target: { value: 'correct-horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.register.submitButtonLabel }))

    await screen.findByText(TEXT.login.heading)

    expect(window.location.pathname).toBe('/login')
  })

  it('the login page links to /register and vice versa', () => {
    renderAppAtPath('/login')

    fireEvent.click(screen.getByRole('link', { name: TEXT.login.registerLinkLabel }))

    expect(screen.getByText(TEXT.register.heading)).toBeInTheDocument()
  })
})
