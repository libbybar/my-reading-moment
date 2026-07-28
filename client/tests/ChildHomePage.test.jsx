import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter, Routes, Route } from 'react-router'
import ChildHomePage from '../src/pages/ChildHomePage'
import { ActiveChildProvider } from '../src/context/ActiveChildProvider'
import { theme } from '../src/styles/theme'

afterEach(() => {
  cleanup()
})

describe('ChildHomePage', () => {
  it('redirects to /children when there is no active child (direct visit or refresh)', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ActiveChildProvider>
          <MemoryRouter initialEntries={['/child-home']}>
            <Routes>
              <Route path="/child-home" element={<ChildHomePage />} />
              <Route path="/children" element={<div>CHILD_SELECTION_SENTINEL</div>} />
            </Routes>
          </MemoryRouter>
        </ActiveChildProvider>
      </ThemeProvider>,
    )

    expect(await screen.findByText('CHILD_SELECTION_SENTINEL')).toBeInTheDocument()
  })
})
