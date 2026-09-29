import { describe, it, expect } from 'vitest'
import { INTERESTS } from '../../src/constants/interests'
// server/src/data/interests.js has zero dependencies (not even Node-only
// ones), so it's safely importable straight from Vitest — the reverse
// (importing this client file, which depends on lucide-react, from the
// server's Jest suite) wouldn't resolve. This is the only place client and
// server interests are compared, so a value added/renamed/removed on one
// side but not the other fails loudly here instead of only at request time.
import SERVER_INTERESTS from '../../../server/src/data/interests.js'

describe('client/server interests value lists', () => {
  it('are byte-for-byte identical, in the same order', () => {
    const clientValues = INTERESTS.map(({ value }) => value)

    expect(clientValues).toEqual(SERVER_INTERESTS)
  })
})
