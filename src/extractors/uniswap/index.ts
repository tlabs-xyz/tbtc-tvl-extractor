import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { GetTBTCPoolsQuery } from './queries.js'
import { UniswapPoolSchema } from './schema.js'
import { getUniswapV3Endpoint } from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { normalizeToWei } from '../../utils/decimals.js'

export class UniswapExtractor extends BaseExtractor {
  readonly protocolName = 'Uniswap V3'
  readonly supportedChains = [Chain.ETHEREUM, Chain.ARBITRUM, Chain.BASE, Chain.OPTIMISM]
  readonly source = ExtractionSource.SUBGRAPH

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractFromSubgraph(chain),
      `Uniswap V3 extraction for ${chain}`
    )
  }

  private async extractFromSubgraph(chain: Chain): Promise<ExtractionResult> {
    const endpoint = getUniswapV3Endpoint(chain)
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!endpoint) {
      throw new Error(`Uniswap V3 not configured for chain: ${chain}`)
    }

    const client = new GraphQLClient(endpoint)

    const rawResponse = await client.request(
      GetTBTCPoolsQuery,
      { token: tbtcAddress.toLowerCase() }
    )

    const validated = UniswapPoolSchema.parse(rawResponse)

    let tvl = 0n
    for (const pool of validated.pools) {
      const token0IsTBTC = pool.token0.id.toLowerCase() === tbtcAddress.toLowerCase()
      const token1IsTBTC = pool.token1.id.toLowerCase() === tbtcAddress.toLowerCase()

      if (token0IsTBTC) {
        const decimals = parseInt(pool.token0.decimals, 10)
        tvl += normalizeToWei(pool.totalValueLockedToken0, decimals)
      }
      if (token1IsTBTC) {
        const decimals = parseInt(pool.token1.decimals, 10)
        tvl += normalizeToWei(pool.totalValueLockedToken1, decimals)
      }
    }

    return {
      protocol: this.protocolName,
      chain,
      tvl,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint }
    }
  }
}
