import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchParentZoneStatus,
  unlockParentZone,
  lockParentZone,
  setParentPin,
  isParentZoneLockedError,
  ParentZoneServiceError,
} from '../../src/services/parentZoneService'

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function okResponse(body) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) }
}

function errorResponse(status, body) {
  return { ok: false, status, json: () => Promise.resolve(body) }
}

describe('parentZoneService', () => {
  it('fetchParentZoneStatus reads /api/parent-zone/status with credentials', async () => {
    globalThis.fetch.mockResolvedValue(okResponse({ pinSet: true, unlocked: false }))

    const status = await fetchParentZoneStatus()

    expect(status).toEqual({ pinSet: true, unlocked: false })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/parent-zone/status', {
      credentials: 'include',
    })
  })

  it('unlockParentZone posts only the pin, with credentials', async () => {
    globalThis.fetch.mockResolvedValue(okResponse({ unlocked: true }))

    await unlockParentZone('1234')

    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/parent-zone/unlock')
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')
    expect(JSON.parse(options.body)).toEqual({ pin: '1234' })
  })

  it('lockParentZone posts to /lock with credentials', async () => {
    globalThis.fetch.mockResolvedValue(okResponse({ locked: true }))

    await lockParentZone()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/parent-zone/lock', {
      method: 'POST',
      credentials: 'include',
    })
  })

  it('setParentPin sends the current PIN and omits the password when only the PIN is given', async () => {
    globalThis.fetch.mockResolvedValue(okResponse({ pinSet: true, unlocked: true }))

    await setParentPin({ newPin: '5678', currentPin: '1234' })

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      newPin: '5678',
      currentPin: '1234',
    })
  })

  it('setParentPin sends the password and omits the current PIN when only the password is given', async () => {
    globalThis.fetch.mockResolvedValue(okResponse({ pinSet: true, unlocked: true }))

    await setParentPin({ newPin: '5678', password: 'correct-horse' })

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      newPin: '5678',
      password: 'correct-horse',
    })
  })

  it('throws a structured error carrying the status and the server errorCode', async () => {
    globalThis.fetch.mockResolvedValue(
      errorResponse(403, { errorCode: 'parent_zone_invalid_credentials' }),
    )

    await expect(unlockParentZone('9999')).rejects.toMatchObject({
      name: 'ParentZoneServiceError',
      status: 403,
      body: { errorCode: 'parent_zone_invalid_credentials' },
    })
  })

  it('keeps the status even when the error body is not JSON', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    })

    await expect(fetchParentZoneStatus()).rejects.toMatchObject({ status: 502, body: null })
  })
})

describe('isParentZoneLockedError', () => {
  it('is true only for a 403 with the parent_zone_locked code', () => {
    const locked = new ParentZoneServiceError('x', {
      status: 403,
      body: { errorCode: 'parent_zone_locked' },
    })

    expect(isParentZoneLockedError(locked)).toBe(true)
  })

  it.each([
    [new ParentZoneServiceError('x', { status: 403, body: { errorCode: 'parent_zone_invalid_credentials' } })],
    [new ParentZoneServiceError('x', { status: 401, body: { errorCode: 'parent_zone_locked' } })],
    [new ParentZoneServiceError('x', { status: 403, body: null })],
    [new Error('network down')],
    [undefined],
  ])('is false for %p', (error) => {
    expect(isParentZoneLockedError(error)).toBe(false)
  })
})
