import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { getChildAvatar } from '../../src/constants/childAvatars'
import { AVATARS } from '../../src/constants/avatars'

afterEach(() => {
  cleanup()
})

describe('getChildAvatar', () => {
  it('returns the generic placeholder icon when the child has not chosen an avatar', () => {
    const { container } = render(getChildAvatar({ avatarId: null }))

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('returns the generic placeholder icon when called with no profile at all', () => {
    const { container } = render(getChildAvatar())

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it("returns an <img> pointing at the child's chosen avatar", () => {
    const [firstAvatar] = AVATARS
    const { container } = render(getChildAvatar({ avatarId: firstAvatar.id }))

    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', firstAvatar.src)
  })

  it('falls back to the placeholder for an unrecognized avatarId', () => {
    const { container } = render(getChildAvatar({ avatarId: 'not-a-real-avatar' }))

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })
})
