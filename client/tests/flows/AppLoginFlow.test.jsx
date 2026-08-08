import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import App from '../../src/App'
import { TEXT } from '../../src/constants/text'
import { theme } from '../../src/styles/theme'
import { login } from '../../src/services/authService'
import { fetchChildProfiles } from '../../src/services/childProfileService'

vi.mock('../../src/services/authService', () => ({
  login: vi.fn(),
}))

vi.mock('../../src/services/childProfileService', () => ({
  fetchChildProfiles: vi.fn(),
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
  login.mockReset()
  fetchChildProfiles.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('App login flow', () => {
  it('a successful login navigates to /children', async () => {
    login.mockResolvedValue({ id: 'parent-1', email: 'parent@example.com' })
    fetchChildProfiles.mockResolvedValue({ childProfiles: [] })

    renderAppAtPath('/login')

    fireEvent.change(screen.getByLabelText(TEXT.login.emailAriaLabel), {
      target: { value: 'parent@example.com' },
    })
    fireEvent.change(screen.getByLabelText(TEXT.login.passwordAriaLabel), {
      target: { value: 'correct-horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.login.submitButtonLabel }))

    await screen.findByText(TEXT.childSelection.emptyMessage)

    expect(window.location.pathname).toBe('/children')
  })

  it('a failed login stays on /login and shows the error message', async () => {
    login.mockRejectedValue(new Error('Request failed with status 401'))

    renderAppAtPath('/login')

    fireEvent.change(screen.getByLabelText(TEXT.login.emailAriaLabel), {
      target: { value: 'parent@example.com' },
    })
    fireEvent.change(screen.getByLabelText(TEXT.login.passwordAriaLabel), {
      target: { value: 'wrong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: TEXT.login.submitButtonLabel }))

    await screen.findByText(TEXT.login.error)

    expect(window.location.pathname).toBe('/login')
    expect(fetchChildProfiles).not.toHaveBeenCalled()
  })
})
