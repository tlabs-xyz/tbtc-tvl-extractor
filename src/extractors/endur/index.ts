import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { ENDUR_TBTC_VAULTS, BALANCE_OF_SELECTOR, STARKNET_RPC_URL } from './config.js'

export class EndurExtractor extends BaseExtractor {
  readonly protocolName = 'Endur'
  readonly supportedChains = [Chain.STARKNET]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Endur extraction for ${chain}`
    )
  }

  private async starknetCall(contractAddress: string, entryPointSelector: string, calldata: string[] = []): Promise<string[] | null> {
    const response = await fetch(STARKNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'starknet_call',
        params: [{ contract_address: contractAddress, entry_point_selector: entryPointSelector, calldata }, 'latest']
      })
    })
    const data = await response.json() as { result?: string[]; error?: { code: number; message: string } }
    if (data.error) throw new Error(`Starknet RPC error ${data.error.code}: ${data.error.message}`)
    return data.result ?? null
  }

  private async getBlockNumber(): Promise<number> {
    const response = await fetch(STARKNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'starknet_blockNumber', params: [] })
    })
    const data = await response.json() as { result?: number }
    return data.result ?? 0
  }

  private async getBalance(tbtcAddress: string, holderAddress: string): Promise<bigint> {
    const result = await this.starknetCall(tbtcAddress, BALANCE_OF_SELECTOR, [holderAddress])
    if (!result || result.length < 2) return 0n
    return BigInt(result[0]) + (BigInt(result[1]) << 128n)
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const vaults = ENDUR_TBTC_VAULTS[chain]
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!vaults || vaults.length === 0) {
      throw new Error(`Endur vaults not configured for chain: ${chain}`)
    }

    let totalTvl = 0n
    for (const vault of vaults) {
      try {
        totalTvl += await this.getBalance(tbtcAddress, vault.vaultAddress)
      } catch (error) {
        this.logger.warn({ vault: vault.name, error: error instanceof Error ? error.message : String(error) }, 'Failed to query vault')
      }
    }

    const blockNumber = await this.getBlockNumber()

    return {
      protocol: this.protocolName,
      chain,
      tvl: totalTvl,
      timestamp: new Date(),
      blockNumber,
      metadata: { source: this.source, endpoint: STARKNET_RPC_URL }
    }
  }
}
