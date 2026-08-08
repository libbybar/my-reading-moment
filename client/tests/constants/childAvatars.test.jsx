import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { getChildAvatar } from '../../src/constants/childAvatars'

afterEach(() => {
  cleanup()
})

describe('getChildAvatar', () => {
  it('returns a renderable placeholder avatar node', () => {
    const { container } = render(getChildAvatar())

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
