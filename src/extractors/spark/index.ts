import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { GetTBTCMarketQuery } from './queries.js'
import { SparkMarketSchema } from './schema.js'
import { getSparkEndpoint } from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { normalizeToWei } from '../../utils/decimals.js'

export class SparkExtractor extends BaseExtractor {
  readonly protocolName = 'Spark Lend'
  readonly supportedChains = [Chain.ETHEREUM]
  readonly source = ExtractionSource.SUBGRAPH

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractFromSubgraph(chain),
      `Spark Lend extraction for ${chain}`
    )
  }

  private async extractFromSubgraph(chain: Chain): Promise<ExtractionResult> {
    const endpoint = getSparkEndpoint(chain)
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!endpoint) {
      throw new Error(`Spark Lend not configured for chain: ${chain}`)
    }

    const client = new GraphQLClient(endpoint)

    const rawResponse = await client.request(
      GetTBTCMarketQuery,
      { inputToken: tbtcAddress.toLowerCase() }
    )

    const validated = SparkMarketSchema.parse(rawResponse)

    if (validated.markets.length === 0) {
      this.logger.warn({ chain }, 'No tBTC market found, returning zero TVL')
      return {
        protocol: this.protocolName,
        chain,
        tvl: 0n,
        timestamp: new Date(),
        metadata: { source: this.source, endpoint }
      }
    }

    const market = validated.markets[0]
    const tvl = normalizeToWei(market.inputTokenBalance, market.inputToken.decimals)

    return {
      protocol: this.protocolName,
      chain,
      tvl,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint }
    }
  }
}
