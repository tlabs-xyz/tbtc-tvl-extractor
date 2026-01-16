import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { EKUBO_MARKET, BALANCE_OF_SELECTOR, STARKNET_RPC_URL } from './config.js'

export class EkuboExtractor extends BaseExtractor {
  readonly protocolName = 'Ekubo'
  readonly supportedChains = [Chain.STARKNET]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Ekubo extraction for ${chain}`
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
    const marketAddress = EKUBO_MARKET[chain]
    const tbtcAddress = TBTC_ADDRESSES[chain]

    if (!marketAddress) {
      throw new Error(`Ekubo market not configured for chain: ${chain}`)
    }

    const tbtcBalance = await this.getBalance(tbtcAddress, marketAddress)
    const blockNumber = await this.getBlockNumber()

    return {
      protocol: this.protocolName,
      chain,
      tvl: tbtcBalance,
      timestamp: new Date(),
      blockNumber,
      metadata: { source: this.source, endpoint: STARKNET_RPC_URL }
    }
  }
}
