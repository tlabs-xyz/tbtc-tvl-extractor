import pino from 'pino'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chain } from '../../types/index.js'
import { AlphaLendExtractor } from './index.js'
import { SUI_RPC_URL, SUI_TBTC_COIN_TYPE } from './config.js'

const logger = pino({ level: 'silent' })
afterEach(() => vi.unstubAllGlobals())

describe('AlphaLend lending-only TVL', () => {
  it.each([
    { holding: '300000000', borrowed: '100000000', expected: 4n * 10n ** 18n },
    { holding: '0', borrowed: '0', expected: 0n },
  ])(
    'counts available plus borrowed supply without Bluefin DEX assets: $expected',
    async ({ holding, borrowed, expected }) => {
      const fetcher = vi.fn(async (url, init) => {
        if (url !== SUI_RPC_URL)
          return Response.json([
            { tokenA: { amount: '250000000', info: { symbol: 'tBTC' } } },
          ])
        const { method } = JSON.parse(init.body)
        const result =
          method === 'suix_getDynamicFields'
            ? { data: [{ objectId: '0x1' }], hasNextPage: false }
            : [
                {
                  data: {
                    content: {
                      fields: {
                        value: {
                          fields: {
                            coin_type: {
                              fields: { name: SUI_TBTC_COIN_TYPE.slice(2) },
                            },
                            balance_holding: holding,
                            borrowed_amount: borrowed,
                          },
                        },
                      },
                    },
                  },
                },
              ]
        return Response.json({ result })
      })
      vi.stubGlobal('fetch', fetcher)
      const result = await new AlphaLendExtractor(logger, {
        retries: 1,
      }).extract(Chain.SUI)
      expect(result.tvl).toBe(expected)
      expect(fetcher.mock.calls.every(([url]) => url === SUI_RPC_URL)).toBe(
        true,
      )
    },
  )

  it('fails when the expected lending market is missing instead of reporting zero', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ result: { data: [], hasNextPage: false } }),
        ),
    )
    await expect(
      new AlphaLendExtractor(logger, { retries: 1 }).extract(Chain.SUI),
    ).rejects.toThrow()
  })

  it('fails a missing RPC result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})))
    await expect(
      new AlphaLendExtractor(logger, { retries: 1 }).extract(Chain.SUI),
    ).rejects.toThrow()
  })
})
