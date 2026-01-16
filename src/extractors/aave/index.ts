import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { GetTBTCReserveQuery } from './queries.js'
import { AaveReserveSchema } from './schema.js'
import { getAaveEndpoint } from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { normalizeToWei } from '../../utils/decimals.js'

export class AaveExtractor extends BaseExtractor {
  readonly protocolName = 'Aave V3'
  readonly supportedChains = [Chain.ETHEREUM, Chain.ARBITRUM, Chain.BASE]
  readonly source = ExtractionSource.SUBGRAPH

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractFromSubgraph(chain),
      `Aave V3 extraction for ${chain}`
    )
  }

  private async extractFromSubgraph(chain: Chain): Promise<ExtractionResult> {
    const endpoint = getAaveEndpoint(chain)
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!endpoint) {
      throw new Error(`Aave V3 not configured for chain: ${chain}`)
    }

    const client = new GraphQLClient(endpoint)

    const rawResponse = await client.request(
      GetTBTCReserveQuery,
      { underlyingAsset: tbtcAddress.toLowerCase() }
    )

    const validated = AaveReserveSchema.parse(rawResponse)

    if (validated.reserves.length === 0) {
      this.logger.warn({ chain }, 'No tBTC reserve found, returning zero TVL')
      return {
        protocol: this.protocolName,
        chain,
        tvl: 0n,
        timestamp: new Date(),
        metadata: { source: this.source, endpoint }
      }
    }

    const reserve = validated.reserves[0]
    const tvl = normalizeToWei(reserve.totalLiquidity, reserve.decimals)

    return {
      protocol: this.protocolName,
      chain,
      tvl,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint }
    }
  }
}
