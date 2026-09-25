import pino from 'pino'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TBTC_ADDRESSES } from '../config/index.js'
import { Chain } from '../types/index.js'
import { EkuboExtractor } from './ekubo/index.js'
import { EndurExtractor } from './endur/index.js'
import { VesuExtractor } from './vesu/index.js'
import { VESU_POOLS_API } from './vesu/config.js'

const logger = pino({ level: 'silent' })
const inventory = {
  data: [
    {
      id: '0x123',
      protocolVersion: 'v2',
      isVerified: true,
      assets: [{ address: TBTC_ADDRESSES[Chain.STARKNET] }],
    },
  ],
}
afterEach(() => vi.unstubAllGlobals())

describe.each([EkuboExtractor, EndurExtractor, VesuExtractor])(
  '%s never publishes failed reads as zero',
  (Extractor) => {
    it('rejects a failed contract read even if the block lookup succeeded', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url, init) => {
          if (url === VESU_POOLS_API) return Response.json(inventory)
          const body = JSON.parse(init.body)
          return Response.json(
            body.method === 'starknet_blockNumber'
              ? { result: 123 }
              : { error: { code: -32000, message: 'unavailable' } },
          )
        }),
      )
      await expect(
        new Extractor(logger, { retries: 1 }).extract(Chain.STARKNET),
      ).rejects.toThrow('Failed after 1 attempts')
    })

    it('rejects a missing result from a retired RPC endpoint', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) =>
          Response.json(url === VESU_POOLS_API ? inventory : {}),
        ),
      )
      await expect(
        new Extractor(logger, { retries: 1 }).extract(Chain.STARKNET),
      ).rejects.toThrow()
    })
  },
)

it('rejects a partial Vesu total when a later pool read fails', async () => {
  let reads = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      if (url === VESU_POOLS_API) return Response.json(inventory)
      const body = JSON.parse(init.body)
      if (body.method === 'starknet_blockNumber')
        return Response.json({ result: 123 })
      return Response.json(
        ++reads === 1 ? { result: ['0x123', '0x0'] } : { error: { code: 24 } },
      )
    }),
  )
  await expect(
    new VesuExtractor(logger, { retries: 1 }).extract(Chain.STARKNET),
  ).rejects.toThrow()
  expect(reads).toBe(2)
})

it('counts each Vesu holder once at the same block, including a newly discovered pool', async () => {
  const blocks: unknown[] = []
  const holders: string[] = []
  const data = [
    ...inventory.data,
    { ...inventory.data[0], id: '0x0123' },
    { ...inventory.data[0], id: '0x456' },
  ]
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      if (url === VESU_POOLS_API) return Response.json({ data })
      const body = JSON.parse(init.body)
      if (body.method === 'starknet_blockNumber')
        return Response.json({ result: 123 })
      blocks.push(body.params.block_id)
      holders.push(body.params.request.calldata[0])
      return Response.json({ result: ['0x1', '0x0'] })
    }),
  )
  const result = await new VesuExtractor(logger, { retries: 1 }).extract(
    Chain.STARKNET,
  )
  expect(result.tvl).toBe(3n)
  expect(holders).toHaveLength(3)
  expect(holders).toContain('0x456')
  expect(blocks).toEqual(Array(3).fill({ block_number: 123 }))
})
