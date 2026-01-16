import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, http, parseAbi, getAddress, Chain as ViemChain } from 'viem'
import { mainnet, base, arbitrum, optimism } from 'viem/chains'
import {
  getCurvePoolsForChain,
  CURVE_API_CHAIN_NAMES,
  CURVE_POOL_TYPES
} from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { CHAIN_CONFIGS } from '../../config/chains.js'

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)'
])

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
    switch (chain) {
      case Chain.ETHEREUM:
        return mainnet
      case Chain.BASE:
        return base
      case Chain.ARBITRUM:
        return arbitrum
      case Chain.OPTIMISM:
        return optimism
      default:
        throw new Error(`Unsupported chain for RPC: ${chain}`)
    }
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
      transport: http(chainConfig.rpcUrl, {
        timeout: this.options.timeout ?? 10000
      })
    })

    let totalTvl = 0n
    for (const poolAddress of poolAddresses) {
      try {
        const checksummedPool = getAddress(poolAddress)
        const checksummedTbtc = getAddress(tbtcAddress)

        const balance = await client.readContract({
          address: checksummedTbtc,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [checksummedPool]
        })
        totalTvl += balance
      } catch {
        // Skip pools that fail (e.g., broken pools)
      }
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
        poolCount: poolAddresses.length
      }
    }
  }
}
