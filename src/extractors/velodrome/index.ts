import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { GetTBTCPoolsQuery } from './queries.js'
import { VelodromePoolSchema } from './schema.js'
import { getVelodromeEndpoint } from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { normalizeToWei } from '../../utils/decimals.js'

export class VelodromeExtractor extends BaseExtractor {
  readonly protocolName = 'Velodrome'
  readonly supportedChains = [Chain.OPTIMISM]
  readonly source = ExtractionSource.SUBGRAPH

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractFromSubgraph(chain),
      `Velodrome extraction for ${chain}`
    )
  }

  private async extractFromSubgraph(chain: Chain): Promise<ExtractionResult> {
    const endpoint = getVelodromeEndpoint(chain)
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!endpoint) {
      throw new Error(`Velodrome not configured for chain: ${chain}`)
    }

    const client = new GraphQLClient(endpoint)

    const rawResponse = await client.request(
      GetTBTCPoolsQuery,
      { token: tbtcAddress.toLowerCase() }
    )

    const validated = VelodromePoolSchema.parse(rawResponse)

    let tvl = 0n
    for (const pool of validated.liquidityPools) {
      const tbtcIndex = pool.inputTokens.findIndex(
        token => token.id.toLowerCase() === tbtcAddress.toLowerCase()
      )
      if (tbtcIndex !== -1 && tbtcIndex < pool.inputTokenBalances.length) {
        const decimals = pool.inputTokens[tbtcIndex].decimals
        tvl += normalizeToWei(pool.inputTokenBalances[tbtcIndex], decimals)
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
