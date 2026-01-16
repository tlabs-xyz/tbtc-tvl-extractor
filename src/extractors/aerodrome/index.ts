import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { GetTBTCPoolsQuery } from './queries.js'
import { AerodromePoolSchema } from './schema.js'
import { getAerodromeEndpoint } from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { parseUnits } from 'viem'

export class AerodromeExtractor extends BaseExtractor {
  readonly protocolName = 'Aerodrome'
  readonly supportedChains = [Chain.BASE]
  readonly source = ExtractionSource.SUBGRAPH

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractFromSubgraph(chain),
      `Aerodrome extraction for ${chain}`
    )
  }

  private async extractFromSubgraph(chain: Chain): Promise<ExtractionResult> {
    const endpoint = getAerodromeEndpoint(chain)
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!endpoint) {
      throw new Error(`Aerodrome not configured for chain: ${chain}`)
    }

    const client = new GraphQLClient(endpoint)

    const rawResponse = await client.request(
      GetTBTCPoolsQuery,
      { token: tbtcAddress.toLowerCase() }
    )

    const validated = AerodromePoolSchema.parse(rawResponse)

    let tvl = 0n
    for (const pool of validated.pools) {
      const token0IsTBTC = pool.token0.id.toLowerCase() === tbtcAddress.toLowerCase()
      const token1IsTBTC = pool.token1.id.toLowerCase() === tbtcAddress.toLowerCase()

      if (token0IsTBTC) {
        tvl += parseUnits(pool.totalValueLockedToken0, 18)
      }
      if (token1IsTBTC) {
        tvl += parseUnits(pool.totalValueLockedToken1, 18)
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
