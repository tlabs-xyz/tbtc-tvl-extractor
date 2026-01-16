import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { SUI_RPC_URL, ALPHALEND_MARKETS_CONTAINER, SUI_TBTC_COIN_TYPE } from './config.js'

interface DynamicFieldPage {
  data: Array<{
    name: { type: string; value: { name: string } }
    objectId: string
  }>
  hasNextPage: boolean
  nextCursor?: string
}

interface MarketObject {
  data?: {
    content?: {
      fields?: {
        balance_holding?: string
        borrowed_amount?: string
      }
    }
    type?: string
  }
}

export class AlphaLendExtractor extends BaseExtractor {
  readonly protocolName = 'AlphaLend'
  readonly supportedChains = [Chain.SUI]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `AlphaLend extraction for ${chain}`
    )
  }

  private async suiRpc(method: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      })
    })

    const data = await response.json() as { result?: unknown; error?: { code: number; message: string } }
    if (data.error) {
      throw new Error(`Sui RPC error ${data.error.code}: ${data.error.message}`)
    }
    return data.result
  }

  private extractCoinType(typeString: string): string | null {
    // Extract coin type from Market<CoinType> pattern
    // Example: "0x...::market::Market<0x77045f1b9f811a7a8fb9ebd085b5b0c55c5cb0d1520ff55f7037f89b5da9f5f1::TBTC::TBTC>"
    const match = typeString.match(/<(.+)>$/)
    return match ? match[1] : null
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    // Get all dynamic fields from the markets container
    let cursor: string | undefined
    let tbtcBalance = 0n
    let tbtcMarketFound = false

    do {
      const dynamicFields = await this.suiRpc('suix_getDynamicFields', [
        ALPHALEND_MARKETS_CONTAINER,
        cursor,
        50 // limit
      ]) as DynamicFieldPage

      // Get all market object IDs from this page
      const marketObjectIds = dynamicFields.data
        .filter(field => field.name.type.includes('::market::Market'))
        .map(field => field.objectId)

      if (marketObjectIds.length > 0) {
        // Batch fetch all market objects
        const marketObjects = await this.suiRpc('sui_multiGetObjects', [
          marketObjectIds,
          { showContent: true, showType: true }
        ]) as MarketObject[]

        // Find tBTC market and get its balance
        for (const marketObj of marketObjects) {
          const objectType = marketObj?.data?.type
          if (!objectType) continue

          const coinType = this.extractCoinType(objectType)
          if (coinType === SUI_TBTC_COIN_TYPE) {
            const fields = marketObj.data?.content?.fields
            const balanceHolding = BigInt(fields?.balance_holding || '0')

            tbtcBalance = balanceHolding
            tbtcMarketFound = true

            this.logger.debug({
              coinType,
              balanceHolding: balanceHolding.toString()
            }, 'Found tBTC market in AlphaLend')

            break
          }
        }
      }

      cursor = dynamicFields.hasNextPage ? dynamicFields.nextCursor : undefined
    } while (cursor && !tbtcMarketFound)

    // Convert from 8 decimals (Sui tBTC) to 18 decimals (standard)
    const tvl = tbtcBalance * 10n ** 10n

    this.logger.debug({
      tbtcMarketFound,
      tbtcBalance: tbtcBalance.toString(),
      tvl: tvl.toString()
    }, 'AlphaLend tBTC balance extracted')

    return {
      protocol: this.protocolName,
      chain,
      tvl,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint: SUI_RPC_URL }
    }
  }
}
