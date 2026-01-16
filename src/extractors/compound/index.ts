import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { GraphQLClient } from 'graphql-request'
import { GetTBTCCollateralTokensQuery, GetMarketCollateralBalanceQuery } from './queries.js'
import { CollateralTokenSchema, MarketCollateralBalanceSchema } from './schema.js'
import { getCompoundV3Endpoint } from './config.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { normalizeToWei } from '../../utils/decimals.js'

export class CompoundExtractor extends BaseExtractor {
  readonly protocolName = 'Compound'
  readonly supportedChains = [Chain.ETHEREUM]
  readonly source = ExtractionSource.SUBGRAPH

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractFromSubgraph(chain),
      `Compound extraction for ${chain}`
    )
  }

  private async extractFromSubgraph(chain: Chain): Promise<ExtractionResult> {
    const endpoint = getCompoundV3Endpoint(chain)
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!endpoint) {
      throw new Error(`Compound not configured for chain: ${chain}`)
    }

    const client = new GraphQLClient(endpoint)

    const collateralResponse = await client.request(
      GetTBTCCollateralTokensQuery,
      { token: tbtcAddress.toLowerCase() }
    )

    const validated = CollateralTokenSchema.parse(collateralResponse)

    if (validated.collateralTokens.length === 0) {
      this.logger.warn({ chain }, 'No tBTC collateral tokens found, returning zero TVL')
      return {
        protocol: this.protocolName,
        chain,
        tvl: 0n,
        timestamp: new Date(),
        metadata: { source: this.source, endpoint }
      }
    }

    let totalTvl = 0n
    for (const collateralToken of validated.collateralTokens) {
      const balanceId = collateralToken.id + '42414c'
      try {
        const balanceResponse = await client.request(
          GetMarketCollateralBalanceQuery,
          { id: balanceId }
        )
        const balanceData = MarketCollateralBalanceSchema.parse(balanceResponse)
        if (balanceData.marketCollateralBalance) {
          const balance = balanceData.marketCollateralBalance.balance
          const decimals = collateralToken.token.decimals
          totalTvl += normalizeToWei(balance, decimals)
        }
      } catch (error) {
        this.logger.warn({
          collateralTokenId: collateralToken.id,
          error: error instanceof Error ? error.message : String(error)
        }, 'Failed to get balance for collateral token')
      }
    }

    return {
      protocol: this.protocolName,
      chain,
      tvl: totalTvl,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint }
    }
  }
}
