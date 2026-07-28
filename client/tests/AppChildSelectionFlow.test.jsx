import { describe, it, expect, vi, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import App from '../src/App'
import { TEXT } from '../src/constants/text'
import { theme } from '../src/styles/theme'
import { fetchChildProfiles } from '../src/services/childProfileService'

// This is the single authoritative test for the full child-selection flow:
// selecting a child on /children, preserving the active child through real
// route navigation, and reaching /child-home without a redirect or leaking
// the internal id. It renders the real App and real routed pages — only the
// external data boundary and avatar output are mocked.
vi.mock('../src/services/childProfileService', () => ({
  fetchChildProfiles: vi.fn(),
}))

vi.mock('../src/constants/childAvatars', () => ({
  getChildAvatar: () => <span data-testid="avatar-sentinel">AVATAR</span>,
}))

const GENERIC_PROFILES = [
  { id: 'profile-alpha', name: 'פרופיל אלפא', grammaticalGender: 'female', readingLevel: 'beginner' },
  { id: 'profile-beta', name: 'פרופיל בטא', grammaticalGender: 'male', readingLevel: 'intermediate' },
]

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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('App child-selection flow', () => {
  it('selecting a child reaches /child-home with the active child preserved and its id hidden', async () => {
    fetchChildProfiles.mockResolvedValue({ childProfiles: GENERIC_PROFILES })

    renderAppAtPath('/children')

    const selectedProfile = GENERIC_PROFILES[0]
    fireEvent.click(await screen.findByRole('button', { name: selectedProfile.name }))

    expect(await screen.findByText(TEXT.childHome.placeholderMessage)).toBeInTheDocument()

    // Reached /child-home directly — no redirect back to /children.
    expect(window.location.pathname).toBe('/child-home')
    expect(screen.queryByText(TEXT.childSelection.heading)).not.toBeInTheDocument()

    // The internal id never leaks into the URL or the rendered UI.
    expect(window.location.href).not.toContain(selectedProfile.id)
    expect(document.body.textContent).not.toContain(selectedProfile.id)
  })
})
