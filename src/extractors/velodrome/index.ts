import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { createPublicClient, http, parseAbi } from 'viem'
import { optimism } from 'viem/chains'
import { GECKO_TERMINAL_NETWORKS, VELODROME_DEX_IDENTIFIERS, VELODROME_CL_POOLS_FALLBACK } from './config.js'
import { TBTC_ADDRESSES, CHAIN_CONFIGS } from '../../config/index.js'

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)'
])

interface GeckoTerminalPool {
  id: string
  type: string
  attributes: {
    address: string
    name: string
  }
  relationships: {
    dex: {
      data: {
        id: string
      }
    }
  }
}

interface GeckoTerminalResponse {
  data: GeckoTerminalPool[]
}

export class VelodromeExtractor extends BaseExtractor {
  readonly protocolName = 'Velodrome'
  readonly supportedChains = [Chain.OPTIMISM]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractHybrid(chain),
      `Velodrome extraction for ${chain}`
    )
  }

  private async extractHybrid(chain: Chain): Promise<ExtractionResult> {
    const tbtcAddress = TBTC_ADDRESSES[chain]
    const chainConfig = CHAIN_CONFIGS[chain]

    // Discover all Velodrome pools (V2 + CL) via GeckoTerminal API
    const poolAddresses = await this.discoverPoolsViaGeckoTerminal(chain, tbtcAddress)

    // Get on-chain balances via RPC
    const client = createPublicClient({
      chain: optimism,
      transport: http(chainConfig.rpcUrl, { timeout: this.options.timeout ?? 10000 })
    })

    let totalTvl = 0n

    if (poolAddresses.length > 0) {
      const batchSize = 50
      for (let i = 0; i < poolAddresses.length; i += batchSize) {
        const batch = poolAddresses.slice(i, i + batchSize)
        const balancePromises = batch.map(poolAddress =>
          client.readContract({
            address: tbtcAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [poolAddress as `0x${string}`]
          }).catch(() => 0n)
        )

        const balances = await Promise.all(balancePromises)
        for (const balance of balances) {
          totalTvl += balance
        }
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
        source: this.source,
        endpoint: chainConfig.rpcUrl,
        poolCount: poolAddresses.length
      }
    }
  }

  private async discoverPoolsViaGeckoTerminal(chain: Chain, tbtcAddress: string): Promise<string[]> {
    const network = GECKO_TERMINAL_NETWORKS[chain]

    if (!network) {
      this.logger.warn({ chain }, 'GeckoTerminal network not configured, using fallback pools')
      return VELODROME_CL_POOLS_FALLBACK[chain] ?? []
    }

    try {
      // GeckoTerminal API to get all pools for a token
      const url = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${tbtcAddress.toLowerCase()}/pools?page=1`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`GeckoTerminal API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as GeckoTerminalResponse

      // Filter for Velodrome pools only (V2 and Slipstream)
      const velodromePools = data.data.filter(pool => {
        const dexId = pool.relationships?.dex?.data?.id
        return dexId && VELODROME_DEX_IDENTIFIERS.some(id => dexId.includes(id))
      })

      const poolAddresses = velodromePools.map(pool => pool.attributes.address.toLowerCase())

      this.logger.info({ chain, poolCount: poolAddresses.length, totalFound: data.data.length }, 'Discovered Velodrome pools via GeckoTerminal')

      // If no pools found via API, use fallback
      if (poolAddresses.length === 0) {
        this.logger.warn({ chain }, 'No Velodrome pools found via API, using fallback')
        return VELODROME_CL_POOLS_FALLBACK[chain] ?? []
      }

      return poolAddresses
    } catch (error) {
      this.logger.warn({ chain, error: error instanceof Error ? error.message : String(error) }, 'Failed to query GeckoTerminal API, using fallback pools')
      return VELODROME_CL_POOLS_FALLBACK[chain] ?? []
    }
  }
}
