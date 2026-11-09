import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Logger } from '../src/utils/logger.js'

const graphqlRequestMock = vi.hoisted(() => vi.fn())
const readContractMock = vi.hoisted(() => vi.fn())
const multicallMock = vi.hoisted(() => vi.fn())
const getBlockNumberMock = vi.hoisted(() => vi.fn())

vi.mock('graphql-request', () => ({
  GraphQLClient: class {
    request(...args: unknown[]) {
      return graphqlRequestMock(...args)
    }
  }
}))

vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem')
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      multicall: multicallMock,
      readContract: readContractMock,
      getBlockNumber: getBlockNumberMock
    }))
  }
})

import { UniswapExtractor } from '../src/extractors/uniswap/index.js'
import { Chain } from '../src/types/index.js'

const silentLogger = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
} as unknown as Logger

function makePool(id: string) {
  return {
    id,
    token0: { id: '0xaaa', symbol: 'TBTC', decimals: '18' },
    token1: { id: '0xbbb', symbol: 'WETH', decimals: '18' },
    totalValueLockedToken0: '0',
    totalValueLockedToken1: '0',
    liquidity: '0',
    feeTier: '3000'
  }
}

describe('UniswapExtractor.extract', () => {
  beforeEach(() => {
    process.env.THEGRAPH_API_KEY = 'test-key'
    graphqlRequestMock.mockReset()
    readContractMock.mockReset()
    multicallMock.mockReset()
    getBlockNumberMock.mockReset()
    getBlockNumberMock.mockResolvedValue(123n)
  })

  afterEach(() => {
    delete process.env.THEGRAPH_API_KEY
  })

  it('returns V4-only TVL when V3 discovery fails but V4 read succeeds', async () => {
    graphqlRequestMock.mockRejectedValue(new Error('subgraph timeout'))
    readContractMock.mockResolvedValue(500n)

    const extractor = new UniswapExtractor(silentLogger, { retries: 1 })
    const result = await extractor.extract(Chain.ETHEREUM)

    expect(result.tvl).toBe(500n)
    expect(result.metadata?.poolCount).toBe(1)
  })

  it('throws when both V3 discovery and V4 read fail (no data published as tvl: 0)', async () => {
    graphqlRequestMock.mockRejectedValue(new Error('subgraph down'))
    readContractMock.mockRejectedValue(new Error('rpc failed'))

    const extractor = new UniswapExtractor(silentLogger, { retries: 1 })
    await expect(extractor.extract(Chain.ETHEREUM)).rejects.toThrow(/Failed after.*Uniswap extraction/)
  })

  it('throws when V3 returns zero pools and V4 read fails', async () => {
    graphqlRequestMock.mockResolvedValue({ pools: [] })
    readContractMock.mockRejectedValue(new Error('rpc failed'))

    const extractor = new UniswapExtractor(silentLogger, { retries: 1 })
    await expect(extractor.extract(Chain.ETHEREUM)).rejects.toThrow(/Failed after.*Uniswap extraction/)
  })

  it('returns partial TVL when V4 read fails but V3 had pools', async () => {
    graphqlRequestMock.mockResolvedValue({
      pools: [makePool('0x1111111111111111111111111111111111111111')]
    })
    multicallMock.mockResolvedValue([{ status: 'success', result: 750n }])
    readContractMock.mockRejectedValue(new Error('v4 rpc failed'))

    const extractor = new UniswapExtractor(silentLogger, { retries: 1 })
    const result = await extractor.extract(Chain.ETHEREUM)

    expect(result.tvl).toBe(750n)
  })

  it('propagates missing-API-key as a hard configuration error', async () => {
    delete process.env.THEGRAPH_API_KEY

    const extractor = new UniswapExtractor(silentLogger, { retries: 1 })
    const err = await extractor.extract(Chain.ETHEREUM).catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error & { cause?: Error }).cause?.message).toMatch(/THEGRAPH_API_KEY/)
  })

  it('sums V3 multicall results and V4 balance into total TVL', async () => {
    graphqlRequestMock.mockResolvedValue({
      pools: [
        makePool('0x1111111111111111111111111111111111111111'),
        makePool('0x2222222222222222222222222222222222222222')
      ]
    })
    multicallMock.mockResolvedValue([
      { status: 'success', result: 100n },
      { status: 'success', result: 200n }
    ])
    readContractMock.mockResolvedValue(400n)

    const extractor = new UniswapExtractor(silentLogger, { retries: 1 })
    const result = await extractor.extract(Chain.ETHEREUM)

    expect(result.tvl).toBe(700n)
    expect(result.metadata?.poolCount).toBe(3)
  })
})
