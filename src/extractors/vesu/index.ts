import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { TBTC_ADDRESSES } from '../../config/index.js'
import { StarknetRpc, BALANCE_OF_SELECTOR } from '../../utils/starknet.js'
import { VESU_SINGLETON } from './config.js'
import { getVesuPoolAddresses } from './pools.js'

export class VesuExtractor extends BaseExtractor {
  readonly protocolName = 'Vesu'
  readonly supportedChains = [Chain.STARKNET]
  readonly source = ExtractionSource.RPC

  async extract(chain: Chain): Promise<ExtractionResult> {
    return this.withRetry(
      () => this.extractViaRpc(chain),
      `Vesu extraction for ${chain}`,
    )
  }

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const singleton = VESU_SINGLETON[chain]
    if (!singleton)
      throw new Error(`Vesu singleton not configured for chain: ${chain}`)
    const tbtcAddress = TBTC_ADDRESSES[chain]
    const pools = await getVesuPoolAddresses(tbtcAddress, this.options.timeout)
    const holders = new Set(
      [singleton, ...pools].map((value) => `0x${BigInt(value).toString(16)}`),
    )
    const rpc = new StarknetRpc(undefined, this.options.timeout)
    const blockNumber = await rpc.getBlockNumber()
    let tvl = 0n
    for (const holder of holders) {
      // Every read must succeed. A partial sum is not this protocol's TVL.
      tvl += await rpc.readUint256(
        tbtcAddress,
        BALANCE_OF_SELECTOR,
        [holder],
        blockNumber,
      )
    }
    return {
      protocol: this.protocolName,
      chain,
      tvl,
      blockNumber,
      timestamp: new Date(),
      metadata: {
        source: this.source,
        endpoint: rpc.endpoint,
        poolCount: holders.size,
      },
    }
  }
}
