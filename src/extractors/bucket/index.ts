import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { SUI_RPC_URL } from './config.js'

// tBTC Bucket object ID (pre-discovered from protocol dynamic fields)
const TBTC_BUCKET_ID = '0x3a3545739027335834e930175942fb11a9d5ca4aea2ebad46770a1cc77d340b3'

export class BucketExtractor extends BaseExtractor {
  readonly protocolName = 'Bucket'
  readonly supportedChains = [Chain.SUI]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Bucket extraction for ${chain}`
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

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    // Get the tBTC Bucket object directly
    const bucketObj = await this.suiRpc('sui_getObject', [
      TBTC_BUCKET_ID,
      { showContent: true }
    ]) as { data?: { content?: { fields?: { collateral_vault?: string; bottle_table?: { fields?: { total_collateral_snapshot?: string } } } } } }

    const fields = bucketObj?.data?.content?.fields
    if (!fields) {
      throw new Error('Failed to fetch Bucket object')
    }

    // Get collateral from the bucket
    // collateral_vault is the current collateral in the vault
    // total_collateral_snapshot from bottle_table includes pending liquidations
    const collateralVault = BigInt(fields.collateral_vault || '0')
    const totalSnapshot = BigInt(fields.bottle_table?.fields?.total_collateral_snapshot || '0')

    // Use the larger of the two as TVL (they can differ during liquidations)
    const collateral8Decimals = collateralVault > totalSnapshot ? collateralVault : totalSnapshot

    // Convert from 8 decimals (Sui tBTC) to 18 decimals (standard)
    const tvl = collateral8Decimals * 10n ** 10n

    this.logger.debug({
      collateralVault: collateralVault.toString(),
      totalSnapshot: totalSnapshot.toString(),
      tvl: tvl.toString()
    }, 'tBTC collateral fetched from Bucket')

    return {
      protocol: this.protocolName,
      chain,
      tvl,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint: SUI_RPC_URL }
    }
  }
}
