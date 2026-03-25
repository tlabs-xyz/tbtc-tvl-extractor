import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, parseAbi, getAddress, Chain as ViemChain } from 'viem'
import { mainnet, base, arbitrum, optimism } from 'viem/chains'
import {
  getCurvePoolsForChain,
  CURVE_API_CHAIN_NAMES,
  CURVE_POOL_TYPES
} from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { CHAIN_CONFIGS, createEvmHttpTransport, getConfiguredRpcEndpoints } from '../../config/chains.js'

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)'
])

/** Max balanceOf calls per multicall batch (RPC limits) */
const MULTICALL_BATCH = 512
const VIEM_CHAINS: Record<Chain, ViemChain | undefined> = {
  [Chain.ETHEREUM]: mainnet,
  [Chain.BASE]: base,
  [Chain.ARBITRUM]: arbitrum,
  [Chain.OPTIMISM]: optimism,
  [Chain.STARKNET]: undefined,
  [Chain.SUI]: undefined
}

interface CurveApiPool {
  id: string
  name: string
  address: string
  coinsAddresses: string[]
}

export class CurveExtractor extends BaseExtractor {
  readonly protocolName = 'Curve'
  readonly supportedChains = [Chain.ETHEREUM, Chain.ARBITRUM, Chain.OPTIMISM, Chain.BASE]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractData(chain),
      `Curve extraction for ${chain}`
    )
  }

  private async extractData(chain: Chain): Promise<ExtractionResult> {
    const tbtcAddress = TBTC_ADDRESSES[chain]
    return this.extractViaRpc(chain, tbtcAddress)
  }

  private getViemChain(chain: Chain): ViemChain {
    const viemChain = VIEM_CHAINS[chain]
    if (!viemChain) {
      throw new Error(`Unsupported chain for RPC: ${chain}`)
    }
    return viemChain
  }

  /**
   * Discover tBTC pools from Curve API for a given chain
   */
  private async discoverPoolsFromApi(chain: Chain, tbtcAddress: string): Promise<string[]> {
    const chainName = CURVE_API_CHAIN_NAMES[chain]
    if (!chainName) {
      return []
    }

    const poolAddresses: string[] = []
    const tbtcLower = tbtcAddress.toLowerCase()

    for (const poolType of CURVE_POOL_TYPES) {
      try {
        const url = `https://api.curve.finance/v1/getPools/${chainName}/${poolType}`
        const response = await fetch(url, {
          signal: AbortSignal.timeout(this.options.timeout ?? 10000)
        })

        if (!response.ok) continue

        const data = await response.json() as { data?: { poolData?: CurveApiPool[] } }
        const pools = data?.data?.poolData

        if (!pools) continue

        for (const pool of pools) {
          const hasTbtc = pool.coinsAddresses?.some(
            (addr: string) => addr.toLowerCase() === tbtcLower
          )
          if (hasTbtc && pool.address) {
            poolAddresses.push(pool.address)
          }
        }
      } catch {
        // Continue to next pool type on error
      }
    }

    return poolAddresses
  }

  private async extractViaRpc(chain: Chain, tbtcAddress: string): Promise<ExtractionResult> {
    const chainConfig = CHAIN_CONFIGS[chain]

    // First try auto-discovery from Curve API
    let poolAddresses = await this.discoverPoolsFromApi(chain, tbtcAddress)

    // Fall back to static config if API discovery fails
    if (poolAddresses.length === 0) {
      const staticPools = getCurvePoolsForChain(chain)
      poolAddresses = staticPools.map(p => p.poolAddress)
    }

    // Also add the crvUSD lending AMM which isn't in the pool API
    // (it's a lending market, not a regular pool)
    if (chain === Chain.ETHEREUM) {
      const lendingAmm = '0xf9bd9da2427a50908c4c6d1599d8e62837c2bcb0'
      if (!poolAddresses.includes(lendingAmm)) {
        poolAddresses.push(lendingAmm)
      }
    }

    // If no pools found, return 0 TVL (some chains may not have tBTC pools)
    if (poolAddresses.length === 0) {
      return {
        protocol: this.protocolName,
        chain,
        tvl: 0n,
        timestamp: new Date(),
        metadata: {
          source: ExtractionSource.RPC,
          endpoint: chainConfig.rpcUrl,
          poolCount: 0
        }
      }
    }

    const client = createPublicClient({
      chain: this.getViemChain(chain),
      transport: createEvmHttpTransport(chain, this.options.timeout ?? 10000)
    })

    const checksummedTbtc = getAddress(tbtcAddress)
    const uniquePools = new Set<string>()
    let invalidPoolAddressCount = 0
    for (const poolAddress of poolAddresses) {
      try {
        uniquePools.add(getAddress(poolAddress))
      } catch {
        invalidPoolAddressCount++
      }
    }

    let totalTvl = 0n
    const poolList = [...uniquePools]
    let failedPoolQueries = 0
    for (let i = 0; i < poolList.length; i += MULTICALL_BATCH) {
      const batch = poolList.slice(i, i + MULTICALL_BATCH)
      try {
        const results = await client.multicall({
          contracts: batch.map(pool => ({
            address: checksummedTbtc,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [pool]
          })),
          allowFailure: true
        })
        for (let j = 0; j < results.length; j++) {
          const r = results[j]
          if (r.status === 'success') {
            totalTvl += r.result as bigint
            continue
          }
          failedPoolQueries++
        }
      } catch (error) {
        this.logger.warn(
          { chain, error: error instanceof Error ? error.message : String(error), batchSize: batch.length },
          'Curve multicall batch failed; falling back to sequential reads'
        )
        for (const pool of batch) {
          try {
            const balance = await client.readContract({
              address: checksummedTbtc,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [pool as `0x${string}`]
            })
            totalTvl += balance
          } catch {
            failedPoolQueries++
          }
        }
      }
    }
    if (invalidPoolAddressCount > 0 || failedPoolQueries > 0) {
      this.logger.warn(
        { chain, invalidPoolAddressCount, failedPoolQueries, totalPools: poolList.length },
        'Curve extraction completed with partial failures'
      )
    }

    const blockNumber = await client.getBlockNumber()

    return {
      protocol: this.protocolName,
      chain,
      tvl: totalTvl,
      timestamp: new Date(),
      blockNumber: Number(blockNumber),
      metadata: {
        source: ExtractionSource.RPC,
        endpoint: chainConfig.rpcUrl,
        endpoints: getConfiguredRpcEndpoints(chain),
        poolCount: poolList.length
      }
    }
  }
}
