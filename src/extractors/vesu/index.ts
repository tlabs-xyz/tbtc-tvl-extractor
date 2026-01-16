import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { VESU_SINGLETON, VESU_V2_POOLS, STARKNET_RPC_URL } from './config.js'

const BALANCE_OF_SELECTOR = '0x02e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e'

export class VesuExtractor extends BaseExtractor {
  readonly protocolName = 'Vesu'
  readonly supportedChains = [Chain.STARKNET]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Vesu extraction for ${chain}`
    )
  }

  private async starknetCall(contractAddress: string, entryPointSelector: string, calldata: string[]): Promise<string[] | null> {
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
    const tbtcAddress = TBTC_ADDRESSES[chain]
    const singletonAddress = VESU_SINGLETON[chain]
    const v2Pools = VESU_V2_POOLS[chain] || []

    if (!singletonAddress) {
      throw new Error(`Vesu singleton not configured for chain: ${chain}`)
    }

    let totalTvl = 0n

    try {
      totalTvl += await this.getBalance(tbtcAddress, singletonAddress)
    } catch (error) {
      this.logger.warn({ contract: 'singleton', error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch singleton balance')
    }

    for (const poolAddress of v2Pools) {
      try {
        const balance = await this.getBalance(tbtcAddress, poolAddress)
        if (balance > 0n) totalTvl += balance
      } catch { /* V2 pool may not exist */ }
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
