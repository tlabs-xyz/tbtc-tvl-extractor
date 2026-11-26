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

  it('requires a successful response from each staging RPC and keeps its token off external dependencies', async () => {
    const send = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}'))
    const guard = createPilotFetch('fixture-token', send)
    await guard.fetch('https://gateway.thegraph.com/api/fixture-graph-key/subgraphs/id/fixture', { method: 'POST' })
    await guard.fetch('https://sui-rpc.publicnode.com', { method: 'POST' })
    await guard.fetch('https://swap.api.sui-prod.bluefin.io/api/v1/pools/info')
    expect(send.mock.calls.every(([request]) => !(request as Request).headers.has('Authorization'))).toBe(true)
    for (const endpoint of [STAGING_RPC.ethereum, STAGING_RPC.arbitrum]) {
      await guard.fetch(endpoint, { method: 'POST' })
    }
    send.mockResolvedValueOnce(new Response('{}', { status: 503 }))
    await guard.fetch(STAGING_RPC.base, { method: 'POST' })
    expect(() => guard.assertCoverage()).toThrow('all three')
    await guard.fetch(STAGING_RPC.base, { method: 'POST' })
    guard.assertCoverage()
    guard.assertClean()
  })
})
