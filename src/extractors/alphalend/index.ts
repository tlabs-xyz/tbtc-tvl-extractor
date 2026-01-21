import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { SUI_RPC_URL, ALPHALEND_MARKETS_CONTAINER, SUI_TBTC_COIN_TYPE, BLUEFIN_API_URL, TBTC_SYMBOLS } from './config.js'

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
        value?: {
          fields?: {
            coin_type?: {
              fields?: {
                name?: string
              }
            }
            balance_holding?: string
            borrowed_amount?: string
          }
        }
      }
    }
    type?: string
  }
}

interface BluefinPool {
  address: string
  symbol: string
  tvl: string
  tokenA: {
    amount: string
    info: {
      symbol: string
      decimals: number
    }
  }
  tokenB: {
    amount: string
    info: {
      symbol: string
      decimals: number
    }
  }
}

export class AlphaLendExtractor extends BaseExtractor {
  readonly protocolName = 'AlphaLend'
  readonly supportedChains = [Chain.SUI]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractAll(chain),
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

  private extractCoinType(marketObj: MarketObject): string | null {
    const name = marketObj?.data?.content?.fields?.value?.fields?.coin_type?.fields?.name
    return name ? `0x${name}` : null
  }

  private isTbtcSymbol(symbol: string): boolean {
    const normalized = symbol.toUpperCase()
    return TBTC_SYMBOLS.some(s => normalized === s.toUpperCase())
  }

  private async extractAll(chain: Chain): Promise<ExtractionResult> {
    // Extract both lending and spot pool TVL
    const [lendingTvl, spotTvl] = await Promise.all([
      this.extractLendingTvl(),
      this.extractSpotTvl()
    ])

    const totalTvl = lendingTvl + spotTvl

    this.logger.info({
      lendingTvl: lendingTvl.toString(),
      spotTvl: spotTvl.toString(),
      totalTvl: totalTvl.toString()
    }, 'AlphaLend total TVL extracted (lending + spot)')

    return {
      protocol: this.protocolName,
      chain,
      tvl: totalTvl,
      timestamp: new Date(),
      metadata: {
        source: this.source,
        endpoint: SUI_RPC_URL,
        lendingTvl: lendingTvl.toString(),
        spotTvl: spotTvl.toString()
      }
    }
  }

  private async extractLendingTvl(): Promise<bigint> {
    let cursor: string | undefined
    let tbtcBalance = 0n

    do {
      const dynamicFields = await this.suiRpc('suix_getDynamicFields', [
        ALPHALEND_MARKETS_CONTAINER,
        cursor,
        50
      ]) as DynamicFieldPage

      const marketObjectIds = dynamicFields.data.map(field => field.objectId)

      if (marketObjectIds.length > 0) {
        const marketObjects = await this.suiRpc('sui_multiGetObjects', [
          marketObjectIds,
          { showContent: true, showType: true }
        ]) as MarketObject[]

        for (const marketObj of marketObjects) {
          const coinType = this.extractCoinType(marketObj)
          if (!coinType) continue

          if (coinType === SUI_TBTC_COIN_TYPE) {
            const valueFields = marketObj.data?.content?.fields?.value?.fields
            const balanceHolding = BigInt(valueFields?.balance_holding || '0')
            const borrowedAmount = BigInt(valueFields?.borrowed_amount || '0')

            // Total supply = available balance + borrowed amount
            tbtcBalance = balanceHolding + borrowedAmount

            this.logger.debug({
              coinType,
              balanceHolding: balanceHolding.toString(),
              borrowedAmount: borrowedAmount.toString(),
              totalSupply: tbtcBalance.toString()
            }, 'Found tBTC lending market')

            // Convert from 8 decimals to 18 decimals
            return tbtcBalance * 10n ** 10n
          }
        }
      }

      cursor = dynamicFields.hasNextPage ? dynamicFields.nextCursor : undefined
    } while (cursor)

    return 0n
  }

  private async extractSpotTvl(): Promise<bigint> {
    try {
      const response = await fetch(BLUEFIN_API_URL, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        this.logger.warn({ status: response.status }, 'Bluefin API error, skipping spot pools')
        return 0n
      }

      const pools = await response.json() as BluefinPool[]
      let totalTbtc = 0n
      let poolCount = 0

      for (const pool of pools) {
        const tokenASymbol = pool.tokenA?.info?.symbol || ''
        const tokenBSymbol = pool.tokenB?.info?.symbol || ''

        if (this.isTbtcSymbol(tokenASymbol)) {
          totalTbtc += BigInt(pool.tokenA.amount || '0')
          poolCount++
        }

        if (this.isTbtcSymbol(tokenBSymbol)) {
          totalTbtc += BigInt(pool.tokenB.amount || '0')
          poolCount++
        }
      }

      this.logger.debug({
        poolCount,
        totalTbtc: totalTbtc.toString()
      }, 'Found tBTC in Bluefin spot pools')

      // Convert from 8 decimals to 18 decimals
      return totalTbtc * 10n ** 10n
    } catch (error) {
      this.logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch Bluefin spot pools')
      return 0n
    }
  }
}
