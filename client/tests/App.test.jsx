import { describe, it, expect, vi, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { theme } from '../src/styles/theme'

vi.mock('../src/pages/ChildSelectionPage', () => ({
  default: () => <div>CHILD_SELECTION_PAGE_SENTINEL</div>,
}))

vi.mock('../src/pages/ReadingSessionPage', () => ({
  default: () => <div>READING_SESSION_PAGE_SENTINEL</div>,
}))

vi.mock('../src/pages/ChildHomePage', () => ({
  default: () => <div>CHILD_HOME_PAGE_SENTINEL</div>,
}))

import App from '../src/App'

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
  window.history.pushState({}, '', '/')
})

describe('App routing', () => {
  it('renders the ChildSelectionPage sentinel at the dedicated /children route', () => {
    renderAppAtPath('/children')

    expect(screen.getByText('CHILD_SELECTION_PAGE_SENTINEL')).toBeInTheDocument()
    expect(screen.queryByText('READING_SESSION_PAGE_SENTINEL')).not.toBeInTheDocument()
  })

  it('renders the ReadingSessionPage sentinel at / (unchanged)', () => {
    renderAppAtPath('/')

    expect(screen.getByText('READING_SESSION_PAGE_SENTINEL')).toBeInTheDocument()
    expect(screen.queryByText('CHILD_SELECTION_PAGE_SENTINEL')).not.toBeInTheDocument()
  })

  it('renders the ChildHomePage sentinel at the dedicated /child-home route', () => {
    renderAppAtPath('/child-home')

    expect(screen.getByText('CHILD_HOME_PAGE_SENTINEL')).toBeInTheDocument()
    expect(screen.queryByText('CHILD_SELECTION_PAGE_SENTINEL')).not.toBeInTheDocument()
  })
})
