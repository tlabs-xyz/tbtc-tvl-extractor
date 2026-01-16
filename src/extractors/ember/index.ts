import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { EMBER_VAULTS_API, EMBER_TBTC_VAULT_ID, SUI_TBTC_COIN_TYPE } from './config.js'

interface EmberVault {
  id: string
  name: string
  depositCoin: {
    address: string
    decimals: number
    symbol: string
  }
  receiptCoin: {
    address: string
  }
  totalDepositsInUsdE9: string
  totalDeposits: string
  reportedApy: {
    targetApyE9: string
  }
  activeDepositorsCount: string
}

export class EmberExtractor extends BaseExtractor {
  readonly protocolName = 'Ember'
  readonly supportedChains = [Chain.SUI]
  readonly source = ExtractionSource.API

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaApi(chain),
      `Ember extraction for ${chain}`
    )
  }

  private async extractViaApi(chain: Chain): Promise<ExtractionResult> {
    // Fetch all vaults from the API (returns array directly)
    const response = await fetch(EMBER_VAULTS_API, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Ember API error: ${response.status} ${response.statusText}`)
    }

    const vaults = await response.json() as EmberVault[]

    // Find the tBTC vault by ID or by coin type
    let tbtcVault: EmberVault | undefined

    // First try to find by known vault ID
    tbtcVault = vaults.find(v => v.id === EMBER_TBTC_VAULT_ID)

    // Fallback: find by tBTC coin type
    if (!tbtcVault) {
      tbtcVault = vaults.find(v =>
        v.depositCoin.address.includes('TBTC') ||
        v.depositCoin.address === SUI_TBTC_COIN_TYPE
      )
    }

    if (!tbtcVault) {
      this.logger.warn({
        vaultCount: vaults.length,
        vaultNames: vaults.map(v => v.name)
      }, 'No tBTC vault found in Ember')

      return {
        protocol: this.protocolName,
        chain,
        tvl: 0n,
        timestamp: new Date(),
        metadata: { source: this.source, endpoint: EMBER_VAULTS_API }
      }
    }

    // Get TVL from totalDeposits field
    // The API returns totalDeposits in the token's native decimals (8 for tBTC)
    const totalDeposits = BigInt(tbtcVault.totalDeposits || '0')
    const decimals = tbtcVault.depositCoin.decimals

    // Convert to 18 decimals (standard)
    const decimalDiff = 18 - decimals
    const tvl = decimalDiff > 0
      ? totalDeposits * 10n ** BigInt(decimalDiff)
      : totalDeposits / 10n ** BigInt(-decimalDiff)

    return {
      protocol: this.protocolName,
      chain,
      tvl,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint: EMBER_VAULTS_API }
    }
  }
}
