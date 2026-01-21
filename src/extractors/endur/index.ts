import { BaseExtractor } from '../base.js'
import { Chain, ExtractionResult, ExtractionSource } from '../../types/index.js'
import { ENDUR_TBTC_VAULTS, STARKNET_RPC_URL } from './config.js'
import { RpcProvider } from 'starknet'

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

  private async extractViaRpc(chain: Chain): Promise<ExtractionResult> {
    const vaults = ENDUR_TBTC_VAULTS[chain]

    if (!vaults || vaults.length === 0) {
      throw new Error(`Endur vaults not configured for chain: ${chain}`)
    }

    const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL })

    let totalTvl = 0n
    for (const vault of vaults) {
      try {
        // ERC4626 vaults report their TVL via total_assets()
        const result = await provider.callContract({
          contractAddress: vault.vaultAddress,
          entrypoint: 'total_assets',
          calldata: []
        })

        if (result && result.length > 0) {
          const low = BigInt(result[0])
          const high = result[1] ? BigInt(result[1]) : 0n
          totalTvl += low + (high << 128n)
        }
      } catch (error) {
        this.logger.warn({ vault: vault.name, error: error instanceof Error ? error.message : String(error) }, 'Failed to query vault total_assets')
      }
    }

    const blockNumber = await provider.getBlockNumber()

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
