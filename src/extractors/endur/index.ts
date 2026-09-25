import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { StarknetRpc, TOTAL_ASSETS_SELECTOR } from '../../utils/starknet.js'
import { ENDUR_TBTC_VAULTS } from './config.js'

export class EndurExtractor extends BaseExtractor {
  readonly protocolName = 'Endur'
  readonly supportedChains = [Chain.STARKNET]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Endur extraction for ${chain}`,
    )
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const vaults = ENDUR_TBTC_VAULTS[chain]
    if (!vaults?.length)
      throw new Error(`Endur vaults not configured for chain: ${chain}`)

    const rpc = new StarknetRpc(undefined, this.options.timeout)
    const blockNumber = await rpc.getBlockNumber()
    let tvl = 0n
    for (const vault of vaults) {
      tvl += await rpc.readUint256(
        vault.vaultAddress,
        TOTAL_ASSETS_SELECTOR,
        [],
        blockNumber,
      )
    }
    return {
      protocol: this.protocolName,
      chain,
      tvl,
      blockNumber,
      timestamp: new Date(),
      metadata: { source: this.source, endpoint: rpc.endpoint },
    }
  }
}
