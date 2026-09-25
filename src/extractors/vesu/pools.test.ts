import { describe, expect, it, vi } from 'vitest'
import { getVesuPoolAddresses } from './pools.js'

describe('Vesu pool discovery', () => {
  it('selects verified tBTC V2 pools without double counting IDs or the V1 singleton', async () => {
    const pool = {
      id: '0x123',
      protocolVersion: 'v2',
      isVerified: true,
      assets: [{ address: '0x0abc' }],
    }
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          data: [
            pool,
            { ...pool, id: '0x0123' },
            { ...pool, id: '0x456' },
            { ...pool, protocolVersion: 'v1' },
            { ...pool, id: '0x789', isVerified: false },
            { ...pool, id: '0x987', assets: [{ address: '0x999' }] },
          ],
        }),
      )
    expect(await getVesuPoolAddresses('0xabc', 100, fetcher)).toEqual([
      '0x123',
      '0x456',
    ])
  })

  it.each([
    {},
    { data: [] },
    { data: [{}] },
    { data: [{ id: '0x1', protocolVersion: 'v2', isVerified: true }] },
  ])(
    'fails unavailable discovery rather than returning a partial inventory: %j',
    async (body) => {
      await expect(
        getVesuPoolAddresses(
          '0xabc',
          100,
          vi.fn().mockResolvedValue(Response.json(body)),
        ),
      ).rejects.toThrow()
    },
  )
})
