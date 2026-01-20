import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { GetTBTCPoolsQuery } from './queries.js'
import { AerodromePoolSchema } from './schema.js'
import { getAerodromeEndpoint } from './config.js'
import { TBTC_ADDRESSES, CHAIN_CONFIGS } from '../../config/index.js'

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)'
])

export class AerodromeExtractor extends BaseExtractor {
  readonly protocolName = 'Aerodrome'
  readonly supportedChains = [Chain.BASE]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractHybrid(chain),
      `Aerodrome extraction for ${chain}`
    )
  }

  private async extractHybrid(chain: Chain): Promise<ExtractionResult> {
    const tbtcAddress = TBTC_ADDRESSES[chain]
    const chainConfig = CHAIN_CONFIGS[chain]

    // Step 1: Discover pools from subgraph
    const poolAddresses = await this.discoverPools(chain, tbtcAddress)

    // Step 2: Get on-chain balances via RPC
    const client = createPublicClient({
      chain: base,
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

  private async discoverPools(chain: Chain, tbtcAddress: string): Promise<string[]> {
    const endpoint = getAerodromeEndpoint(chain)

    if (!endpoint) {
      return []
    }

    try {
      const client = new GraphQLClient(endpoint)

      const rawResponse = await client.request(
        GetTBTCPoolsQuery,
        { token: tbtcAddress.toLowerCase() }
      )

      const validated = AerodromePoolSchema.parse(rawResponse)

      return validated.pools.map(pool => pool.id.toLowerCase())
    } catch (error) {
      this.logger.warn({ endpoint, error: error instanceof Error ? error.message : String(error) }, 'Failed to query Aerodrome subgraph for pools')
      return []
    }
  }
}
