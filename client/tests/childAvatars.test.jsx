import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { getChildAvatar } from '../src/constants/childAvatars'

afterEach(() => {
  cleanup()
})

describe('getChildAvatar', () => {
  it('returns a renderable avatar node regardless of which profile is passed', () => {
    const profileA = { id: 'a', name: 'א', grammaticalGender: 'female', readingLevel: 'beginner' }
    const profileB = { id: 'b', name: 'ב', grammaticalGender: 'male', readingLevel: 'advanced' }

    const { container: containerA } = render(getChildAvatar(profileA))
    const { container: containerB } = render(getChildAvatar(profileB))

    expect(containerA.querySelector('svg')).toBeInTheDocument()
    expect(containerB.querySelector('svg')).toBeInTheDocument()
  })
})
