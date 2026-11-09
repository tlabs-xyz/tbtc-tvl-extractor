import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { StarknetRpc, BALANCE_OF_SELECTOR } from '../../utils/starknet.js'
import { EKUBO_MARKET } from './config.js'

export class EkuboExtractor extends BaseExtractor {
  readonly protocolName = 'Ekubo'
  readonly supportedChains = [Chain.STARKNET]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Ekubo extraction for ${chain}`,
    )
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const marketAddress = EKUBO_MARKET[chain]
    if (!marketAddress)
      throw new Error(`Ekubo market not configured for chain: ${chain}`)

    const rpc = new StarknetRpc(undefined, this.options.timeout)
    const blockNumber = await rpc.getBlockNumber()
    const tvl = await rpc.readUint256(
      TBTC_ADDRESSES[chain],
      BALANCE_OF_SELECTOR,
      [marketAddress],
      blockNumber,
    )
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
