import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import {
  SUI_RPC_URL,
  ALPHALEND_MARKETS_CONTAINER,
  SUI_TBTC_COIN_TYPE,
} from './config.js'

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

export class AlphaLendExtractor extends BaseExtractor {
  readonly protocolName = 'AlphaLend'
  readonly supportedChains = [Chain.SUI]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractAll(chain),
      `AlphaLend extraction for ${chain}`,
    )
  }

  private async suiRpc(method: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.options.timeout ?? 10_000),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    })

    if (!response.ok) throw new Error(`Sui RPC HTTP ${response.status}`)
    const data = (await response.json()) as {
      result?: unknown
      error?: { code: number; message: string }
    }
    if (data.error) {
      throw new Error(`Sui RPC error ${data.error.code}: ${data.error.message}`)
    }
    if (data.result == null)
      throw new Error(`Sui RPC ${method} returned no result`)
    return data.result
  }

  private extractCoinType(marketObj: MarketObject): string | null {
    const name =
      marketObj?.data?.content?.fields?.value?.fields?.coin_type?.fields?.name
    return name ? `0x${name}` : null
  }

  private async extractAll(chain: Chain): Promise<ExtractionResult> {
    const tvl = await this.extractLendingTvl()
    return {
      protocol: this.protocolName,
      chain,
      tvl,
      timestamp: new Date(),
      metadata: {
        source: this.source,
        endpoint: SUI_RPC_URL,
        lendingTvl: tvl.toString(),
      },
    }
  }

  private async extractLendingTvl(): Promise<bigint> {
    let cursor: string | undefined
    let tbtcBalance = 0n

    do {
      const dynamicFields = (await this.suiRpc('suix_getDynamicFields', [
        ALPHALEND_MARKETS_CONTAINER,
        cursor,
        50,
      ])) as DynamicFieldPage

      const marketObjectIds = dynamicFields.data.map((field) => field.objectId)

      if (marketObjectIds.length > 0) {
        const marketObjects = (await this.suiRpc('sui_multiGetObjects', [
          marketObjectIds,
          { showContent: true, showType: true },
        ])) as MarketObject[]

        for (const marketObj of marketObjects) {
          const coinType = this.extractCoinType(marketObj)
          if (!coinType) continue

          if (coinType === SUI_TBTC_COIN_TYPE) {
            const valueFields = marketObj.data?.content?.fields?.value?.fields
            const holding = valueFields?.balance_holding
            const borrowed = valueFields?.borrowed_amount
            if (
              !holding ||
              !borrowed ||
              !/^\d+$/.test(holding) ||
              !/^\d+$/.test(borrowed)
            ) {
              throw new Error('AlphaLend tBTC market returned invalid balances')
            }
            const balanceHolding = BigInt(holding)
            const borrowedAmount = BigInt(borrowed)

            // Total supply = available balance + borrowed amount
            tbtcBalance = balanceHolding + borrowedAmount

            this.logger.debug(
              {
                coinType,
                balanceHolding: balanceHolding.toString(),
                borrowedAmount: borrowedAmount.toString(),
                totalSupply: tbtcBalance.toString(),
              },
              'Found tBTC lending market',
            )

            // Convert from 8 decimals to 18 decimals
            return tbtcBalance * 10n ** 10n
          }
        }
      }

      cursor = dynamicFields.hasNextPage ? dynamicFields.nextCursor : undefined
    } while (cursor)

    throw new Error('AlphaLend tBTC lending market was not found')
  }
}
