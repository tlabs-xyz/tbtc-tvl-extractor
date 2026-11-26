import { describe, expect, it, vi } from 'vitest'
import { createPilotFetch, STAGING_RPC } from '../src/pilot/proxy-fetch.js'

describe('staging proxy pilot', () => {
  it('does not send a direct Alchemy fallback and fails the run even if the extractor catches it', async () => {
    const send = vi.fn<typeof fetch>()
    const guard = createPilotFetch('fixture-token', send)
    await expect(guard.fetch('https://eth-mainnet.g.alchemy.com/v2/test', { method: 'POST' })).rejects.toThrow('blocked')
    expect(send).not.toHaveBeenCalled()
    expect(() => guard.assertClean()).toThrow('outside')
  })

  it('sends bearer auth only to staging RPC and does not follow redirects', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    const guard = createPilotFetch('fixture-token', send)
    await guard.fetch(STAGING_RPC.base, { method: 'POST', body: '{}' })
    await guard.fetch('https://api.curve.finance/v1/getPools/base/main')
    const [rpc, discovery] = send.mock.calls.map(([request]) => request as Request)
    expect(rpc.headers.get('Authorization')).toBe('Bearer fixture-token')
    expect(rpc.redirect).toBe('error')
    expect(discovery.headers.has('Authorization')).toBe(false)
    expect(discovery.redirect).toBe('error')
  })
})
