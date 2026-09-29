import { describe, it, expect } from 'vitest'
import { AVATARS } from '../../src/constants/avatars'
// Same reasoning as interests.test.js: server/src/data/avatars.js has no
// dependencies, so it's safely importable from Vitest even though it lives
// in a different package.
import SERVER_AVATARS from '../../../server/src/data/avatars.js'

describe('client/server avatar id lists', () => {
  it('are byte-for-byte identical, in the same order', () => {
    const clientIds = AVATARS.map(({ id }) => id)

    expect(clientIds).toEqual(SERVER_AVATARS)
  })
})
